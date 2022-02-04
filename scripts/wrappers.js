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
