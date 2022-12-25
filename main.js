class Triangle {
    constructor(vertices, hue) {
        this.vertices = vertices;
        this.visible = true;
        this.hue = hue;
        this.folds = 0;
        this.children = [];
    }

    inherit(vertices) {
        const res = new Triangle(
            vertices,
            this.hue * (1 + 0.2 * (Math.random() - 0.5))
        );
        res.visible = this.visible;
        res.folds = this.folds;
        this.children.push(res);
        return res;
    }

    reflectOne([a, b], u) {
        const e = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
        const x = ((a.x - b.x) * u.x * (a.x - b.x) + (a.y - b.y) * (u.y * (a.x - b.x) - a.x * b.y + b.x * a.y)) / e;
        const y = ((a.y - b.y) * u.x * (a.x - b.x) + u.y * (a.y - b.y) * (a.y - b.y) + a.x * a.x * b.y - a.x * b.x * (a.y + b.y) + b.x * b.x * a.y) / e;
        return {
            x: 2 * x - u.x,
            y: 2 * y - u.y,
        }
    }

    reflect(line) {
        console.log('Reflect', line);
        const [u, v, w] = this.vertices;
        // TODO: Animate this via rotation somehow
        this.vertices = [
            this.reflectOne(line, u),
            this.reflectOne(line, v),
            this.reflectOne(line, w),
        ];
    };
}

class Transform {

    constructor(previous, type, input) {
        this.previous = previous;
        this.type = type;
        this.input = input;
        this.triangles = [];
        this.affected = [];
        this.apply()
    }

    recursiveUnfold(triangle, line) {
        triangle.children.forEach(t => {
            this.recursiveUnfold(t, line);
        });
        triangle.reflect(line);
    }

    apply() {
        if (this.type == 'fold') {
            this.triangles = this.previous.triangles.map(
                t => cutTriangle(t, this.input)
            ).flat();
            this.triangles.forEach(t => {
                const frontSide = getSide(t, this.input);
                if (frontSide) {
                    // Fold / reflect
                    t.reflect(this.input);
                    t.folds += step;
                    this.affected.push(t);
                    // console.log('Folded triangle', t);
                }
            });
            console.log('Folded', this);
        } else if (this.type == 'unfold') {
            this.triangles = this.previous.triangles;
            this.affected = this.previous.affected;
            const undo = this.input;
            undo.affected.forEach(t => {
                // Unfold / reflect only what was folded on the given transformation
                this.recursiveUnfold(t, undo.input);
                //console.log('Unfolded triangle', t);
            });
            console.log('Unfolded', this.input);
        } else if (this.type == 'cut') {
            this.triangles = this.previous.triangles.map(
                t => cutTriangle(t, this.input)
            ).flat();
            this.triangles.forEach(t => {
                const frontSide = getSide(t, this.input);
                if (frontSide) {
                    // Cut
                    t.visible = false;
                    this.affected.push(t);
                    // console.log('Cut triangle', t);
                }
            });
            console.log('Cut', this);
        } else if (this.type == 'init') {
            this.triangles = this.input;
        } else {
            console.error('Unknown transformation type', this.type);
        }
    }
}

function initSquare() {
    return [
        new Triangle([{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}], 0.25),
        new Triangle([{x: 0, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}], 0.75),
    ];
}

function initCircle(n, r) {
    const M = 2 * Math.PI / n;
    return [...Array(n).keys()].map(pt =>
        new Triangle([
            {
                x: r * Math.sin(pt * M) + 0.5,
                y: r * Math.cos(pt * M) + 0.5
            },
            {
                x: r * Math.sin((pt + 1) * M) + 0.5,
                y: r * Math.cos((pt + 1) * M) + 0.5
            },
            {x: 0.5, y: 0.5}
        ], pt / n)
    );
}

//let last = new Transform(undefined, 'init', initCircle(20, 0.5));
let last = new Transform(undefined, 'init', initSquare());

let scene, camera, renderer;
let R_FOLD = 0.1;
let R_CUT = 0.5;
let R = 1;
let step = 0;

const toGeometry = (triangles) => {
    const geometry = new THREE.Geometry();
    const visible = triangles.filter(t => t.visible);
    const vertices = visible.map(t => ([
        new THREE.Vector3(t.vertices[0].x, t.vertices[0].y, t.folds * 0.001),
        new THREE.Vector3(t.vertices[1].x, t.vertices[1].y, t.folds * 0.001),
        new THREE.Vector3(t.vertices[2].x, t.vertices[2].y, t.folds * 0.001),
    ])).flat();
    geometry.vertices.push(...vertices);
    geometry.faces.push(...(visible.map((t, index) =>
        new THREE.Face3(
            index * 3, index * 3 + 1, index * 3 + 2,
            new THREE.Vector3(0, 0, 1)
        )
    )));
    return geometry;
};

const randomLine = (radius) => {
    const phi1 = Math.random() * 2 * Math.PI;
    const phi2 = Math.random() * 2 * Math.PI;
    return [
        {x: Math.sin(phi1) * radius + 0.5, y: Math.cos(phi1) * radius + 0.5},
        {x: Math.sin(phi2) * radius + 0.5, y: Math.cos(phi2) * radius + 0.5},
    ]
};

const toLineGeometry = ([c0, c1], z) => (new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(c0.x, c0.y, z),
        new THREE.Vector3(c1.x, c1.y, z),
    ]),
    new THREE.LineBasicMaterial({
        color: 0x555555
    })
));

const toPoint = (pt, z) => {
    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(pt.x, pt.y, z));
    return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size: 3,
            sizeAttenuation: false,
            color: 0x000000
        })
    );
};

const circle = (radius, z, pts = 100) => {
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([...Array(pts).keys()].map(pt =>
            new THREE.Vector3(
                Math.sin(pt / (pts - 1) * 2 * Math.PI) * radius + 0.5,
                Math.cos(pt / (pts - 1) * 2 * Math.PI) * radius + 0.5,
                z
            )
        )),
        new THREE.LineBasicMaterial({
            color: 0x555500
        })
    );
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);

    const light = new THREE.DirectionalLight();
    light.position.set(0, 1, 2);
    scene.add(light);

    updateScene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0.5;
    camera.position.y = 0.5;
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, 0.5, 0.5);   // Center
    controls.update();

    window.addEventListener( 'resize', onResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);

    update();
}

function update() {
    requestAnimationFrame(update);
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function unfoldLast() {
    let tr = last;
    while (tr !== undefined) {
        if (tr.type == 'fold') {
            last = new Transform(last, 'unfold', tr);
            step++;
            // break;  // TODO: Do it better (inherit triangles?..)
        }
        tr = tr.previous;
    }
    updateScene();
}

function updateScene() {
    scene.children = [];
    last.triangles.forEach(t => {
        const color = new THREE.Color();
        color.setHSL(t.hue, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: color });
        material.side = THREE.DoubleSide;
        let surface = new THREE.Mesh(
            toGeometry([t]),
            material
        );
        scene.add(surface);
    });
}

function displayLine(l) {
    // Paint circle, line and intersections
    let topLayer = 0.1;
    scene.add(circle(R, topLayer))
    scene.add(toLineGeometry(l, topLayer));
    last.triangles.forEach(t => {
        const pt1 = intersect([t.vertices[0], t.vertices[1]], l);
        if (pt1 !== undefined) scene.add(toPoint(pt1, topLayer));
        const pt2 = intersect([t.vertices[1], t.vertices[2]], l);
        if (pt2 !== undefined) scene.add(toPoint(pt2, topLayer));
        const pt3 = intersect([t.vertices[2], t.vertices[0]], l);
        if (pt3 !== undefined) scene.add(toPoint(pt3, topLayer));
    });
}

function onDocumentKeyDown(event) {
    // console.log('Keypress', event.which)
    if (event.which == 13) {
        // ENTER to Refresh
        updateScene();
    } else if (event.which == 27) {
        // ESC to Unfold
        unfoldLast();
        updateScene();
    } else if (event.which == 32) {
        // SPACE to Fold
        const l = randomLine(R_FOLD);
        last = new Transform(last, 'fold', l);
        step++;
        updateScene();
        displayLine(l);
    } else if (event.which == 67) {
        // "C" to Cut
        const l = randomLine(R_CUT);
        last = new Transform(last, 'cut', l);
        step++;
        updateScene();
        displayLine(l);
    }
}

init();