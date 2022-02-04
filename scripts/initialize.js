import * as Wrapper from "./wrappers.js"

// Convenience variable to insert the module name where required
export const ModuleName = "hooking-tokens";

/** Hooks once on 'init' to conditionally OVERRIDE the foundry.js functions to introduce the new hooks */
Hooks.once('init', () => {
    Wrapper.coreAnimateFrame();
    Wrapper.coreAnimatePromise();
    Wrapper.coreTerminateAnimation();
    Wrapper.coreTokenAnimateLinear();
    Wrapper.coreRulerMoveToken();
})



/** The Hooks below were developed as proof of concepts, to be used as macros.

// This hook will spit out animation data at time of termination to the console.
// It will also set the token's position at the spot where the animation was terminated.
// Core sets the token position before animation starts, so terminating an animation in core sends the token to the end point.
Hooks.once('tokenAnimationTerminated', (data) => {
    console.log("Token animation terminated early: ", data);
    ui.notifications.info("Notification triggered off the new 'tokenAnimationTerminated' hook.  See console for animation data!");
    const token = data[0].parent;
    const isToX = data.filter(d => d.attribute === "x");
    const isToY = data.filter(d => d.attribute === "y");

    const wasX = isToX.length ? (isToX[0].to - (isToX[0].delta - isToX[0].done)) : token.data.x;
    const wasY = isToY.length ? (isToY[0].to - (isToY[0].delta - isToY[0].done)) : token.data.y;

    token.position.set(wasX, wasY);

    token.document.update({_id: token.id, x: wasX, y: wasY}, {animate: false});
})

// This was a test to inject a function into the tokenAnimate callback that is added to the canvas ticker.
// It will just generate a console log message on every tick.
Hooks.once('preTokenAnimate', (token, data) => {

    const myNewVar = "YES!";
    data.ontick = (dt, anim) => {
        token._onMovementFrame(dt, anim, data.config);
        console.log("Have I added this console.log to the ontick function? ", myNewVar);
    }
    console.log("preTokenAnimate hook has fired!");
})

// This hook will cause token movement to be cancelled before it beings.  This applies to movements entered via waypoints (hold ctrl and click path)
// The token will emote text in a chat bubble.
Hooks.once('preTokenChainMove', (token) => {
    const bubble = new ChatLog;
    bubble.processMessage("Whoa!  Do you think I can remember all those waypoints!?");
    return false
})

// This hook will increase the movement speed by 3.  It does this by dividing the duration by 3.
Hooks.once('preTokenAnimate', (token, data) => {
    // This hook will make the token faster than normal.
    data.duration /= 3; 
})

// This hook will emote text in a chat bubble, when an animation is complete.
Hooks.once('tokenAnimationComplete', (token) => {
    const bubble = new ChatLog;
    bubble.processMessage("If you didn't drag me down into these places, I wouldn't have to strain myself running in full armor to get past these rediculous obstacles you can't seem to avoid...")
})

// This hook alters the waypoints of a token movement.  The intent was to have the token move between waypoints that I would enter in a zig-zag pattern.
// The logic here is very wrong.  But it still demonstrates that the waypoints can be changed via the hook.
Hooks.once('preTokenChainMove', (token, Ruler) => {

    for (let i=1; i < Ruler.waypoints.length - 1; i++) {
        Ruler.waypoints[i].x = (Ruler.waypoints[i].x + Ruler.waypoints[i+1].x) / 2;
        Ruler.waypoints[i].y = (Ruler.waypoints[i].y + Ruler.waypoints[i+1].y) / 2;
    }
})

// This hook injects more code into the animate callback (ontick).
// The injected code adds a PIXI Graphics circle to the canvas every 100 or so pixels.
Hooks.once('preTokenAnimate', (token, data) => {
    const tokenCenter = token.w/2;
    let lastPos = {
        x: token.data.x,
        y: token.data.y
    }
    data.ontick = (dt, anim) => {
        token._onMovementFrame(dt, anim, data.config);
        const currLoc = {
            x: token.data.x + tokenCenter,
            y: token.data.y + tokenCenter,
        }
        if (    Math.abs(lastPos.x - token.data.x) > 100 ||
                Math.abs(lastPos.y - token.data.y) > 100
        ) {
            const poopDot = new PIXI.Graphics();
            poopDot.beginFill(0xe74c3c);
            poopDot.drawCircle(currLoc.x, currLoc.y, 10);
            poopDot.endFill();
            canvas.background.addChild(poopDot);
            lastPos = {
                x: token.data.x,
                y: token.data.y
            }
        }
    }
})
*/