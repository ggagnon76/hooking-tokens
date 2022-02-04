import { ModuleName } from "./initialize.js"

export function coreAnimateFrame() {
    libWrapper.register(ModuleName, 'CanvasAnimation._animateFrame', function animateFrameHook(wrapper, ...args) {
        const attributes = args[3];
        const token = attributes[0]?.parent;
        if (!(token instanceof Token)) return wrapper(...args);
        const animationName = token.movementAnimationName;

        if (CanvasAnimation.animations[animationName]?.terminate) {
            Hooks.callAll('tokenAnimationTerminated', attributes);
            args[4] = 0;
            return wrapper(...args);
        }

        return wrapper(...args);
    }, 'WRAPPER');
}

export function coreAnimatePromise() {
    libWrapper.register(ModuleName, 'CanvasAnimation._animatePromise', async function animatePromiseHook(wrapper, ...args) {
        const attributes = args[3];
        const token = attributes[0]?.parent;
        await wrapper(...args);
        if ((token instanceof Token)) Hooks.callAll('tokenAnimationComplete', token);
    }, 'WRAPPER');
}

export function OLDcoreAnimateFrame() {
    libWrapper.register(ModuleName, 'CanvasAnimation._animateFrame', async function animateFrameHook(wrapper, ...args) {
        const [deltaTime, resolve, reject, attributes, duration, ontick] = args;        // Added by Hooking Tokens.
        const token = attributes[0]?.parent;                                            // Added by Hooking Tokens.
        const animationName = token.movementAnimationName;                              // Added by Hooking Tokens.

        if (!(token instanceof Token)) return wrapper(...args);                         // Added by Hooking Tokens.

        let complete = attributes.length === 0;
        let dt = (duration * PIXI.settings.TARGET_FPMS) / deltaTime;
        
        if (CanvasAnimation.animations[animationName]?.terminate) {                     // Added by Hooking Tokens.
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
            Hooks.callAll('tokenAnimationComplete', attributes[0].parent);              // Added by Hooking Tokens.
            resolve(true);
        }   
    }, 'MIXED');
}

export function coreTerminateAnimation() {
    libWrapper.register(ModuleName, 'CanvasAnimation.terminateAnimation', function terminateAnimationHook(wrapper, ...args) {
        const [name] = args;                                                            // Added by Hooking Tokens.

        if (!name.includes("Token")) return wrapper(...args)                            // Added by Hooking Tokens.

        let animation = this.animations[name];
        if (animation) animation.terminate = true;                                      // Added by Hooking Tokens.
    }, 'MIXED')
}

export function coreRulerMoveToken() {
    libWrapper.register(ModuleName, 'Ruler.prototype.moveToken', async function preRulerMoveHook(wrapper) {
        const token = this._getMovementToken();
        if ( !token ) return wrapper();

        const allowed = Hooks.call('preTokenChainMove', token, this);
        if ( !allowed ) {
            console.log("Token movement prevented by 'preTokenChainMove' hook.");
            this.destination = null;
            this._endMeasurement();
        }

        return wrapper();
    }, 'WRAPPER');
}



export function coreTokenAnimateLinear() {
    libWrapper.register(ModuleName, 'CanvasAnimation.animateLinear', function preAnimateLinearHook(wrapper, ...args) {
        const [attributes, fnData] = args;
        let {context, name, duration, ontick} = fnData;

        if (!(context instanceof Token)) return wrapper(...args);

        let data = {
            duration: duration,
            config: {
                animate: game.settings.get("core", "visionAnimation"),
                source: context._isVisionSource() || context.emitsLight,
                sound: context._controlled || context.observer,
                forceUpdateFog: context.emitsLight && !context._controlled && (canvas.sight.sources.size > 0)
            },
            ontick: null
        }
        data.ontick = (dt, anim) => context._onMovementFrame(dt, anim, data.config)

        Hooks.call('preTokenAnimate', context, data)

        return wrapper(attributes, {
            context: context, 
            name: name, 
            duration: data.duration, 
            ontick: data.ontick
        });
    }, 'WRAPPER');
}