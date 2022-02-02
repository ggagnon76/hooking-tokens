import * as Wrapper from "./wrappers.js"

// Convenience variable to insert the module name where required
export const ModuleName = "hooking-tokens";

/** Hooks once on 'init' to OVERRIDE the foundry.js functions to introduce the new hooks */
Hooks.once('init', () => {
    Wrapper.coreAnimateFrame();
    Wrapper.coreTerminateAnimation();
    Wrapper.coreTokenAnimateMovement();
    Wrapper.coreTokenMovement();
    Wrapper.coreRulerMoveToken();
})

/** Testing the new token movement terminated hook! 
Hooks.on('tokenAnimationTerminated', (data) => {
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
*/

/**
Hooks.on('preTokenAnimate', (token, data) => {

    const myNewVar = "YES!";
    data.ontick = (dt, anim) => {
        token._onMovementFrame(dt, anim, data.config);
        console.log("Have I added this console.log to the ontick function? ", myNewVar);
    }
    console.log("preTokenAnimate hook has fired!");
})
*/

/** This hook will cause a token movement to be cancelled and the token will emote text in a chat bubble.
Hooks.once('preTokenMove', (token, updates) => {
    // This hook will make the token say, "Does it look like I can fly!?" and cancel the movement.
    const bubble = new ChatLog;
    bubble.processMessage("Does it look like I can fly!?");
    return false
})
*/

/**
Hooks.once('preTokenChainMove', (token) => {
    const bubble = new ChatLog;
    bubble.processMessage("Whoa!  Do you think I can remember all those waypoints!?");
    return false
})
*/

/**
Hooks.once('preTokenAnimate', (token, data) => {
    // This hook will make the token faster than normal.
    data.duration /= 3; 
})
*/

/**
Hooks.once('tokenAnimationComplete', (token) => {
    const bubble = new ChatLog;
    bubble.processMessage("If you didn't drag me down into these places, I wouldn't have to strain myself running in full armor to get past these rediculous obstacles you can't seem to avoid...")
})
*/

/**
Hooks.once('preTokenMove', (token, updates) => {

    const midpoint = {
        x: (token.data.x + updates[0].x) / 2,
        y: (token.data.y + updates[0].y) / 2
    }

    updates[0].x = midpoint.x;
    updates[0].y = midpoint.y;

    Hooks.once('tokenAnimationComplete', (token) => {
        const bubble = new ChatLog;
        bubble.processMessage("Sh!t, I slipped...");
    })
})
*/

/**
Hooks.once('preTokenChainMove', (token, Ruler) => {

    for (let i=0; i < Ruler.waypoints.length - 1; i++) {
        Ruler.waypoints[i].x = (Ruler.waypoints[i].x + Ruler.waypoints[i+1].x) / 2;
        Ruler.waypoints[i].y = (Ruler.waypoints[i].y + Ruler.waypoints[i+1].y) / 2;
    }
})
*/

/**
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
