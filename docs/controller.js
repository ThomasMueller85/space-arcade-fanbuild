let controller = null;

window.addEventListener("gamepadconnected", (e) => {
    console.log("Controller verbunden:", e.gamepad.id);
    controller = e.gamepad.index;
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Controller getrennt:", e.gamepad.id);
    controller = null;
});

export function readController() {
    if (controller === null) return null;

    const gp = navigator.getGamepads() [controller];
    if (!gp) return null;

    // Achsen
    const x = gp.axes[0]; // linker Stick X
    const y = gp.axes[1]; // linker Stick y

    return { x, y,
        shoot: gp.buttons[7].value > 0.5,   // RT
        thrust: gp.buttons[6].value > 0.5,  // LT
        pause: gp.buttons[9].pressed,       // Start
        select: gp.buttons[8].pressed,      // Select
        hyper: gp.buttons[0].pressed,       // A
        rocket: gp.buttons[1].pressed       // B
    };
}

export function rumble(strength = 1.0, duration = 200) {
    const gp = navigator.getGamepads()[0];  // erster aktiver Controller
    if (!gp) return;

    const actuator = gp.vibrationActuator || gp.hapticActuators?.[0];
    if (actuator && actuator.type === "dual-rumble") {
        actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration,
            weakMagnitude: strength,
            strongMagnitude: strength // stärken der verschiedenen Motoren oben links unten rechts
        }).catch(() => {});
    }
}