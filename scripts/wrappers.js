import { ModuleName } from "./initialize.js"

export function coreAnimateFrame() {
    libWrapper.register(ModuleName, 'CanvasAnimation._animateFrame', async function animateFrameHook(wrapper, ...args) {
        const [deltaTime, resolve, reject, attributes, duration, ontick] = args;
        const token = attributes[0]?.parent;
        const animationName = token.movementAnimationName;

        if (!(token instanceof Token)) return wrapper(...args);

        let complete = attributes.length === 0;
        let dt = (duration * PIXI.settings.TARGET_FPMS) / deltaTime;
        
        if (CanvasAnimation.animations[animationName]?.terminate) {
            Hooks.callAll('tokenAnimationTerminated', attributes);
            return resolve(true);
        }

        // Update each attribute
        try {
            for (let a of attributes) {
                let da = a.delta / dt;
                a.d = da;
                if (a.remaining < (Math.abs(da) * 1.25)) {
                a.parent[a.attribute] = a.to;
                a.done = a.delta;
                a.remaining = 0;
                complete = true;
                } else {
                a.parent[a.attribute] += da;
                a.done += da;
                a.remaining = Math.abs(a.delta) - Math.abs(a.done);
                }
            }
            if (ontick) ontick(dt, attributes);
        } catch (err) {
            reject(err);
        }

        // Resolve the original promise once the animation is complete
        if (complete) {
            Hooks.callAll('tokenAnimationComplete', attributes[0].parent);
            resolve(true);
        }   
    }, 'MIXED');
}

export function coreTerminateAnimation() {
    libWrapper.register(ModuleName, 'CanvasAnimation.terminateAnimation', function terminateAnimationHook(wrapper, ...args) {
        const [name] = args;

        if (!name.includes("Token")) return wrapper(...args)

        let animation = this.animations[name];
        if (animation) animation.terminate = true;
    }, 'MIXED')
}

export function coreTokenMovement() {
    libWrapper.register(ModuleName, 'Token.prototype._onDragLeftDrop', function preMoveHook(event) {
        const clones = event.data.clones || [];
        const {originalEvent, destination} = event.data;

        // Ensure the cursor destination is within bounds
        if ( !canvas.dimensions.rect.contains(destination.x, destination.y) ) return false;

        // Compute the final dropped positions
        const updates = clones.reduce((updates, c) => {

            // Get the snapped top-left coordinate
            let dest = {x: c.data.x, y: c.data.y};
            if ( !originalEvent.shiftKey && (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) ) {
                const isTiny = (c.data.width < 1) && (c.data.height < 1);
                dest = canvas.grid.getSnappedPosition(dest.x, dest.y, isTiny ? 2 : 1);
            }

            // Test collision for each moved token vs the central point of it's destination space
            const target = c.getCenter(dest.x, dest.y);
            if ( !game.user.isGM ) {
                c._velocity = c._original._velocity;
                let collides = c.checkCollision(target);
                if ( collides ) {
                ui.notifications.error("ERROR.TokenCollide", {localize: true});
                return updates
                }
            }

            // Otherwise ensure the final token center is in-bounds
            else if ( !canvas.dimensions.rect.contains(target.x, target.y) ) return updates;

            // Perform updates where no collision occurs
            updates.push({_id: c._original.id, x: dest.x, y: dest.y});
            return updates;
        }, []);

        const allowed = Hooks.call('preTokenMove', this, updates);
        if ( allowed ) {
            // Submit the data update
            return canvas.scene.updateEmbeddedDocuments("Token", updates);
        } else console.log("Token movement prevented by 'preTokenMove' hook.");
    }, 'OVERRIDE');
}

export function coreRulerMoveToken() {
    libWrapper.register(ModuleName, 'Ruler.prototype.moveToken', async function preRulerMoveHook() {
        let wasPaused = game.paused;
        if ( wasPaused && !game.user.isGM ) {
        ui.notifications.warn("GAME.PausedWarning", {localize: true});
        return false;
        }
        if ( !this.visible || !this.destination ) return false;
        const token = this._getMovementToken();
        if ( !token ) return false;

        // Allow a preTokenMove Hook to abort or alter the movement
        const allowed = Hooks.call('preTokenChainMove', token, this);
        if ( !allowed ) {
            console.log("Token movement prevented by 'preTokenChainMove' hook.");
            this._endMeasurement();
            return false;
        }

        // Determine offset relative to the Token top-left.
        // This is important so we can position the token relative to the ruler origin for non-1x1 tokens.
        const origin = canvas.grid.getTopLeft(this.waypoints[0].x, this.waypoints[0].y);
        const s2 = canvas.dimensions.size / 2;
        const dx = Math.round((token.data.x - origin[0]) / s2) * s2;
        const dy = Math.round((token.data.y - origin[1]) / s2) * s2;

        // Get the movement rays and check collision along each Ray
        // These rays are center-to-center for the purposes of collision checking
        let rays = this._getRaysFromWaypoints(this.waypoints, this.destination);
        let hasCollision = rays.some(r => canvas.walls.checkCollision(r));
        if ( hasCollision ) {
        ui.notifications.error("ERROR.TokenCollide", {localize: true});
        return false;
        }

        // Execute the movement path defined by each ray.
        this._state = Ruler.STATES.MOVING;
        let priorDest = undefined;
        for ( let r of rays ) {

        // Break the movement if the game is paused
        if ( !wasPaused && game.paused ) break;

        // Break the movement if Token is no longer located at the prior destination (some other change override this)
        if ( priorDest && ((token.data.x !== priorDest.x) || (token.data.y !== priorDest.y)) ) break;

        // Adjust the ray based on token size
        const dest = canvas.grid.getTopLeft(r.B.x, r.B.y);
        const path = new Ray({x: token.x, y: token.y}, {x: dest[0] + dx, y: dest[1] + dy});

        // Commit the movement and update the final resolved destination coordinates
        await token.document.update(path.B);
        path.B.x = token.data.x;
        path.B.y = token.data.y;
        priorDest = path.B;

        // Retrieve the movement animation and await its completion
        const anim = CanvasAnimation.getAnimation(token.movementAnimationName);
        if ( anim?.promise ) await anim.promise;
        }

        // Once all animations are complete we can clear the ruler
        this._endMeasurement();
    }, 'OVERRIDE');
}

export function coreTokenAnimateMovement() {
    libWrapper.register(ModuleName, 'Token.prototype.animateMovement', async function preAnimateHook(...args) {
        
        const [ray] = args;
        // Move distance is 10 spaces per second
        const s = canvas.dimensions.size;
        this._movement = ray;
        const speed = s * 10;
        const emits = this.emitsLight;

        // Define attributes
        // Determine what type of updates should be animated
        const data = {
            duration: (ray.distance * 1000) / speed,
            attributes: [
                { parent: this, attribute: 'x', to: ray.B.x },
                { parent: this, attribute: 'y', to: ray.B.y }
                ],
            config: {
                animate: game.settings.get("core", "visionAnimation"),
                source: this._isVisionSource() || emits,
                sound: this._controlled || this.observer,
                forceUpdateFog: emits && !this._controlled && (canvas.sight.sources.size > 0)
                },
            ontick: null
        }
        data.ontick = (dt, anim) => this._onMovementFrame(dt, anim, data.config)

        Hooks.call('preTokenAnimate', this, data);

        // Dispatch the animation function
        await CanvasAnimation.animateLinear(data.attributes, 
            {   name: this.movementAnimationName,
                context: this,
                duration: data.duration,
                ontick: data.ontick
            });


        // Once animation is complete perform a final refresh
        if ( !data.config.animate ) this._animatePerceptionFrame({source: data.config.source, sound: data.config.sound});
        this._movement = null; 
    }, 'OVERRIDE');
}