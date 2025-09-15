export function makeWedge(count, spacing) {
    // V Formation: Leader = Slot 0 (0,0), danach links/rechts gestaffelt
    const slots = [{ x: 0, y: 0}];
    let arm = 1;
    while (slots.length < count) {
        // rechts
        if (slots.length < count)
            slots.push({ x: -arm * spacing, y: +arm * spacing});
        // links
        if (slots.length < count)
            slots.push({ x: -arm * spacing, y: -arm * spacing });
        arm++;
    }
    return slots;
}

export function makeLine (count, spacing) {
    // Linie quer: Leader vorne Mitte, dann seitlich alternierend
    const slots = [{ x: 0, y: 0}];
    let k = 1;
    while (slots.length < count) {
        if (slots.length < count) slots.push({ x: 0, y: +k * spacing});
        if (slots.length < count) slots.push({ x: 0, y: -k * spacing});
        k++;
    }
    return slots;
}

export function makeBox (count, spacing) {
    // Rechteck/Gitter (2 Reihen): vorne 0,0, dann Raster nach hinten
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const slots = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols && idx < count; idx++) {
            slots.push ({
                x: r * spacing,                      // nach hinten
                y: ( c - (cols - 1) / 2) * spacing   // zentriert quer
            });
        }
    }
    // Leader auf (0,0): finde den Punkt am nächsten zu (0,0) und tausche
    let li = 0, best = Infinity;
    for (let i = 0; i < slots.length; i++) {
        const d2 = slots[i].x * slots[i].x + slots[i].y * slots[i].y;
        if (d2 < best) { best = d2; li = i; }
    }
    const tmp = slots[0]; slots[0] = slots[li]; slots[li] = tmp;
    return slots;
}

export function buildSlots (type, count, spacing) {
    if (type === 'line') return makeLine(count, spacing);
    if (type === 'box')  return makeBox (count, spacing);
    return makeWedge (count, spacing); // default 'wedge'
}