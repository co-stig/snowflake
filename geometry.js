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

const cutTriangle = (triangle, [c0, c1]) => {
    const [u, v, w] = triangle.vertices;
    const uv = intersect([u, v], [c0, c1]);
    const vw = intersect([v, w], [c0, c1]);
    const wu = intersect([w, u], [c0, c1]);
    if (uv !== undefined && wu !== undefined) {
        // Cut out corner "U"
        return [
            triangle.inherit([u, uv, wu]),
            triangle.inherit([uv, v, wu]),
            triangle.inherit([v, w, wu])
        ];
    } else if (uv !== undefined && vw !== undefined) {
        // Cut out corner "V"
        return [
            triangle.inherit([v, vw, uv]),
            triangle.inherit([vw, w, uv]),
            triangle.inherit([w, u, uv])
        ];
    } else if (vw !== undefined && wu !== undefined) {
        // Cut out corner "W"
        return [
            triangle.inherit([w, wu, vw]),
            triangle.inherit([wu, u, vw]),
            triangle.inherit([u, v, vw])
        ];
    } else if (uv !== undefined) {
        // Cuts UV through W
        return [
            triangle.inherit([w, u, uv]),
            triangle.inherit([uv, v, w])
        ];
    } else if (vw !== undefined) {
        // Cuts VW through U
        return [
            triangle.inherit([u, v, vw]),
            triangle.inherit([vw, w, u])
        ];
    } else if (wu !== undefined) {
        // Cuts WU through V
        return [
            triangle.inherit([v, w, wu]),
            triangle.inherit([wu, u, v])
        ];
    } else {
        // The entire triangle is on one of the sides
        return [
            triangle.inherit([u, v, w])
        ];
    }
};

const getSide = (triangle, [c0, c1]) => {
    const [u, v, w] = triangle.vertices;
    const cx = (u.x + v.x + w.x) / 3;
    const cy = (u.y + v.y + w.y) / 3;
    const d = cy * (c1.x - c0.x) + c0.y * (cx - c1.x) + c1.y * (c0.x - cx);
    return d >= 0;
};
