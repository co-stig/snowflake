const intersect = ([s0, s1], [c0, c1]) => {
    const A = (c1.x - c0.x) * (s0.y - c0.y) - (s0.x - c0.x) * (c1.y - c0.y);
    const B = (s1.x - s0.x) * (c1.y - c0.y) - (c1.x - c0.x) * (s1.y - s0.y);
    if (B == 0 || A == 0) {
        return undefined;   // No intersection *within* the segment S
    } else {
        const t = A / B;
        if (t <= 0 || t >= 1) {
            return undefined;
        }
        return {
            x: s0.x + t * (s1.x - s0.x),
            y: s0.y + t * (s1.y - s0.y)
        };
    }
};

const cutTriangle = ([u, v, w], [c0, c1]) => {
    const uv = intersect([u, v], [c0, c1]);
    const vw = intersect([v, w], [c0, c1]);
    const wu = intersect([w, u], [c0, c1]);
    if (uv !== undefined && wu !== undefined) {
        // Cut out corner "U"
        return [[u, uv, wu], [uv, v, wu], [v, w, wu]];
    } else if (uv !== undefined && vw !== undefined) {
        // Cut out corner "V"
        return [[v, vw, uv], [vw, w, uv], [w, u, uv]];
    } else if (vw !== undefined && wu !== undefined) {
        // Cut out corner "W"
        return [[w, wu, vw], [wu, u, vw], [u, v, vw]];
    } else if (uv !== undefined) {
        // Cuts UV through W
        return [[w, u, uv], [uv, v, w]];
    } else if (vw !== undefined) {
        // Cuts VW through U
        return [[u, v, vw], [vw, w, u]];
    } else if (wu !== undefined) {
        // Cuts WU through V
        return [[v, w, wu], [wu, u, v]];
    } else {
        // The entire triangle is on one of the sides
        return [[u, v, w]];
    }
};

const getSide = ([u, v, w], [c0, c1]) => {
    const cx = (u.x + v.x + w.x) / 3;
    const cy = (u.y + v.y + w.y) / 3;
    const d = cy * (c1.x - c0.x) + c0.y * (cx - c1.x) + c1.y * (c0.x - cx);
    return d >= 0;
};