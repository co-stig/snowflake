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
                    if (t.folds == 0) {
                        t.folds = 1;
                    } else {
                        t.folds *= 2;
                    }
                    this.affected.push(t);
                    // console.log('Folded triangle', t);
                }
            });
            //console.log('Folded', this);
        } else if (this.type == 'unfold') {
            this.triangles = this.previous.triangles;
            this.affected = this.previous.affected;
            const undo = this.input;
            undo.affected.forEach(t => {
                // Unfold / reflect only what was folded on the given transformation
                this.recursiveUnfold(t, undo.input);
                //console.log('Unfolded triangle', t);
            });
            //console.log('Unfolded', this.input);
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
            //console.log('Cut', this);
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

function initSolidSquare() {
    return [
        new Triangle([{x: -0.5, y: -0.5}, {x: 0.5, y: -0.5}, {x: 0.5, y: 0.5}], 0.5),
        new Triangle([{x: -0.5, y: -0.5}, {x: 0.5, y: 0.5}, {x: -0.5, y: 0.5}], 0.5),
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

function grayscaleColorScheme(t, i, cnt) {
    const color = new THREE.Color();
    color.setHSL(0.5, 0, 0.5 + Math.random() * 0.1);
    return color;
}

function goldColorScheme(t, i, cnt) {
    const color = new THREE.Color();
    color.setHSL(0.09 + Math.random() * 0.1, 1, 0.6 + Math.random() * 0.1);
    return color;
}

function greenColorScheme(t, i, cnt) {
    const color = new THREE.Color();
    color.setHSL(0.3 + Math.random() * 0.1, 1.5, 0.1 + Math.random() * 0.1);
    return color;
}

function rainbowColorScheme(t, i, cnt) {
    const color = new THREE.Color();
    color.setHSL(i / cnt, 1, 0.5);
    return color;
}

function topologyColorScheme(t, i, cnt) {
    const color = new THREE.Color();
    color.setHSL(t.hue, 1, 0.5);
    return color;
}

const initialGeometry = window.location.search.indexOf('circle') >= 0 ? initCircle(20, 0.5) : initSquare();
let colorScheme = grayscaleColorScheme;

let last = new Transform(undefined, 'init', initialGeometry);

let scene, camera, renderer;
let R = 1;
let step = 0;
let unfolded = false;
let rulerPlane = null;

let ctX = 0, ctY = 0, ctZ = 1;      // Camera target

const rulerA = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 16),
    new THREE.MeshLambertMaterial({ color: 0xFF5500 })
), rulerB = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 16),
    new THREE.MeshLambertMaterial({ color: 0xFF5500 })
), light1 = new THREE.AmbientLight(0xFFFFFF, 1.25),
light2 = new THREE.DirectionalLight(0xFFFFFF, 0.5);
light2.position.set(5, 1, 5);
light2.castShadow = true;
rulerA.position.x = 0;
rulerA.position.y = 0;
rulerB.position.x = 0.25;
rulerB.position.y = 0.25;

const topLayer = 0.01;

const toGeometry = (triangles, levels=true) => {
    const geometry = new THREE.Geometry();
    const visible = triangles.filter(t => t.visible);
    const vertices = visible.map(t => ([
        new THREE.Vector3(t.vertices[0].x, t.vertices[0].y, levels ? t.folds * 0.001 : 0),
        new THREE.Vector3(t.vertices[1].x, t.vertices[1].y, levels ? t.folds * 0.001 : 0),
        new THREE.Vector3(t.vertices[2].x, t.vertices[2].y, levels ? t.folds * 0.001 : 0),
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
    const length = Math.sqrt(
        Math.pow(line[0].x - line[1].x, 2) +
        Math.pow(line[0].y - line[1].y, 2)
    );
    if (length > 0) {
        let dx = line[1].x - line[0].x;
        let dy = line[1].y - line[0].y;
        let r = 10 / length;
        let shift = {
            x: -dy * r,
            y: dx * r
        };
        geometry.vertices.push(...[
            new THREE.Vector3(line[0].x - dx * r, line[0].y - dy * r, topLayer),
            new THREE.Vector3(line[1].x + dx * r, line[1].y + dy * r, topLayer),
            new THREE.Vector3(line[0].x + shift.x, line[0].y + shift.y, topLayer),
            new THREE.Vector3(line[1].x + shift.x, line[1].y + shift.y, topLayer),
        ]);
        geometry.faces.push(...[
            new THREE.Face3(0, 1, 2, new THREE.Vector3(0, 0, 1)),
            new THREE.Face3(1, 3, 2, new THREE.Vector3(0, 0, 1)),
        ]);
    }
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


function init() {
    document.getElementById('c').style.background = "url('backgrounds/" + Math.floor(Math.random() * 10) + ".jpg') scroll center center / cover";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);

    camera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.1, 1000);
    // camera = new THREE.OrthographicCamera(window.innerWidth / - 1000, window.innerWidth / 1000, window.innerHeight / 1000, window.innerHeight / - 1000, 0.1, 1000);

    const canvas = document.querySelector('#c');
    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColorHex( 0xffffff, 1 );

    document.body.appendChild(renderer.domElement);

    const controls = new DragControls(
        [rulerA, rulerB],
        camera,
        renderer.domElement
    );
    controls.addEventListener('drag', function(event) {
        drawRuler();
    });

    window.addEventListener('resize', onResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);

    updateScene(colorScheme);

    update();
}

function update() {
    if (unfolded) {
        scene.rotation.y += 0.01;
    }

    if (Math.abs(camera.position.x - ctX) < 0.01) {
        camera.position.x = ctX;
    } else {
        camera.position.x += (ctX - camera.position.x) / 10;
    }
    if (Math.abs(camera.position.y - ctY) < 0.01) {
        camera.position.y = ctY;
    } else {
        camera.position.y += (ctY - camera.position.y) / 10;
    }
    if (Math.abs(camera.position.z - ctZ) < 0.01) {
        camera.position.z = ctZ;
    } else {
        camera.position.z += (ctZ - camera.position.z) / 10;
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

function findCenter(triangles) {
    let x = 0, y = 0, xmin = 10, xmax = -10, ymin = 10, ymax = -10, total = 0;
    triangles.forEach(t => {
        if (t.visible) {
            t.vertices.forEach(v => {
                x += v.x;
                y += v.y;
                if (v.x < xmin) {
                    xmin = v.x;
                }
                if (v.y < ymin) {
                    ymin = v.y;
                }
                if (v.x > xmax) {
                    xmax = v.x;
                }
                if (v.y > ymax) {
                    ymax = v.y;
                }
                total++;
            });
        }
    })
    return total > 0 ? {
        x: x / total,
        y: y / total,
        r: Math.max(xmax - xmin, ymax - ymin)
    } : { x: 0, y: 0, r: 1 };
}

function drawRuler() {
    scene.remove(rulerA);
    scene.remove(rulerB);
    if (rulerPlane !== null) {
        scene.remove(rulerPlane);
    }
    if (!unfolded) {
        scene.add(rulerA);
        scene.add(rulerB);
        if (isSelectedLine()) {
            rulerPlane = new THREE.Mesh(
                rulerGeometry(selectedLine()),
                new THREE.MeshLambertMaterial({
                    color: 0xFF7700,
                    opacity: 0.2,
                    transparent: true,
                })
            );
            scene.add(rulerPlane);
        }
    }
}

function updateScene(colorScheme) {
    scene.children = [light1, light2];

    const center = findCenter(last.triangles);
    ctX = center.x;
    ctY = center.y;
    ctZ = Math.sqrt(center.r);

    const cnt = last.triangles.length;
    const materialType = unfolded ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    last.triangles.forEach((t, i) => {
        const color = colorScheme(t, i, cnt);
        const material = new materialType({
            color: color,
            side: THREE.DoubleSide,
            opacity: unfolded ? 1 : 0.8,
            transparent: true,
            roughness: 0.5,
            wireframe: false,
            metalness: 0.6,
        });
        let surface = new THREE.Mesh(
            toGeometry([t], !unfolded),
            material
        );
        scene.add(surface);
    });
    drawRuler();
}

function onControl(type) {
    if (!unfolded) {
        if (type == 'unfold') {
            unfold();
            const r = Math.random();
            colorScheme = r < 0.33 ? greenColorScheme : (r < 0.66 ? goldColorScheme : rainbowColorScheme);
            scene.background = null;
            for (let i = 1; i <= 4; ++i) {
                document.getElementById('b' + i).style.visibility = 'hidden';
            }
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
        updateScene(colorScheme);
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