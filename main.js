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
        new Triangle([{x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}, {x: 0.5, y: 0.5}], 0.25),
        new Triangle([{x: -0.5, y: -0.5}, {x: 0.5, y: 0.5}, {x: -0.5, y: 0.5}], 0.75),
    ];
}

function initCircle(n, r) {
    const M = 2 * Math.PI / n;
    return [...Array(n).keys()].map(pt =>
        new Triangle([
            {
                x: r * Math.sin(pt * M),
                y: r * Math.cos(pt * M)
            },
            {
                x: r * Math.sin((pt + 1) * M),
                y: r * Math.cos((pt + 1) * M)
            },
            {x: 0, y: 0}
        ], pt / n)
    );
}

let last = new Transform(undefined, 'init', initCircle(20, 0.5));
//let last = new Transform(undefined, 'init', initSquare());

let scene, camera, renderer;
let R = 1;
let step = 0;
let unfolded = false;

const rulerA = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x440000 })
), rulerB = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x440000 })
), light1 = new THREE.AmbientLight(0xFFFFFF, 1),
light2 = new THREE.DirectionalLight(0xFFFFFF, 0.5);
light2.position.set(5, 0, 5);
light2.castShadow = true;

const topLayer = 0.01;

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
    geometry.computeFaceNormals();
    return geometry;
};

const rulerGeometry = (line) => {
    const geometry = new THREE.Geometry();
    let shift = {
        x: line[0].y - line[1].y,
        y: line[1].x - line[0].x
    };
    geometry.vertices.push(...[
        new THREE.Vector3(line[0].x, line[0].y, topLayer),
        new THREE.Vector3(line[1].x, line[1].y, topLayer),
        new THREE.Vector3(line[0].x + shift.x, line[0].y + shift.y, topLayer),
        new THREE.Vector3(line[1].x + shift.x, line[1].y + shift.y, topLayer),
    ]);
    geometry.faces.push(...[
        new THREE.Face3(0, 1, 2, new THREE.Vector3(0, 0, 1)),
        new THREE.Face3(1, 3, 2, new THREE.Vector3(0, 0, 1)),
    ]);
    console.log('Ruler', geometry);
    return geometry;
};

const selectedLine = () => {
    return [
        {x: rulerA.position.x, y: rulerA.position.y},
        {x: rulerB.position.x, y: rulerB.position.y},
    ]
};

const isSelectedLine = () => {
    return rulerA.position.x !== rulerB.position.x || rulerA.position.y !== rulerB.position.y;
};

const randomLine = (radius) => {
    const phi1 = Math.random() * 2 * Math.PI;
    const phi2 = Math.random() * 2 * Math.PI;
    return [
        {x: Math.sin(phi1) * radius + 0.5, y: Math.cos(phi1) * radius + 0.5},
        {x: Math.sin(phi2) * radius + 0.5, y: Math.cos(phi2) * radius + 0.5},
    ]
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFFF);

    updateScene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new DragControls(
        [rulerA, rulerB],
        camera,
        renderer.domElement
    );
    controls.addEventListener('drag', function(event) {
        updateScene();
    });

    window.addEventListener('resize', onResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);

    update();
}

function update() {
    if (unfolded) {
        scene.rotation.y += 0.01;
    }
    requestAnimationFrame(update);
    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function unfold() {
    let tr = last;
    while (tr !== undefined) {
        if (tr.type == 'fold') {
            last = new Transform(last, 'unfold', tr);
            step++;
        }
        tr = tr.previous;
    }
    unfolded = true;
}

function updateScene() {
    scene.children = [light1, light2];
    last.triangles.forEach(t => {
        const color = new THREE.Color();
        color.setHSL(t.hue, 1, 0.5);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
            opacity: 0.8,
            transparent: true,
        });
        let surface = new THREE.Mesh(
            toGeometry([t]),
            material
        );
        scene.add(surface);
    });
    if (!unfolded) {
        scene.add(rulerA);
        scene.add(rulerB);
        if (isSelectedLine()) {
            scene.add(new THREE.Mesh(
                rulerGeometry(selectedLine()),
                new THREE.MeshStandardMaterial({
                    color: 0xFF0000,
                    opacity: 0.2,
                    transparent: true,
                })
            ));
        }
    }
}

function onControl(type) {
    if (!unfolded) {
        if (type == 'unfold') {
            unfold();
        } else if (type == 'fold') {
            if (isSelectedLine()) {
                const l = selectedLine();
                last = new Transform(last, 'fold', l);
                step++;
            }
        } else if (type == 'cut') {
            const l = selectedLine();
            last = new Transform(last, 'cut', l);
            step++;
        }
        updateScene();
    }
}

function onDocumentKeyDown(event) {
    if (!unfolded) {
        if (event.which == 27) {
            // ESC to Unfold
            onControl('unfold');
        } else if (event.which == 32) {
            onControl('fold');
        } else if (event.which == 67) {
            onControl('cut');
        }
    }
}

init();