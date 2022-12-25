let triangles = [
    [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}],
    [{x: 0, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}],
];

let scene, camera, renderer;
let R = 0.25;

const toGeometry = (triangles, color) => {
    const geometry = new THREE.Geometry();
    const vertices = triangles.map(t => ([
        new THREE.Vector3(t[0].x, t[0].y, 0),
        new THREE.Vector3(t[1].x, t[1].y, 0),
        new THREE.Vector3(t[2].x, t[2].y, 0),
    ])).flat();
    geometry.vertices.push(...vertices);
    geometry.faces.push(...(triangles.map((t, index) =>
        new THREE.Face3(
            index * 3, index * 3 + 1, index * 3 + 2,
            new THREE.Vector3(0, 0, 1),
            color
        )
    )));
    geometry.faces.forEach(face => {
        console.log('Face', face)
        face.vertexColors[0] = new THREE.Color(0xff0000); // red
        face.vertexColors[1] = new THREE.Color(0x00ff00); // green
        face.vertexColors[2] = new THREE.Color(0x0000ff); // blue
    });
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

const toLineGeometry = ([c0, c1]) => (new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(c0.x, c0.y, 0.01),
        new THREE.Vector3(c1.x, c1.y, 0.01),
    ]),
    new THREE.LineBasicMaterial({
        color: 0xFFFFFF
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

const circle = (radius, pts = 100) => {
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([...Array(pts).keys()].map(pt =>
            new THREE.Vector3(
                Math.sin(pt / (pts - 1) * 2 * Math.PI) * radius + 0.5,
                Math.cos(pt / (pts - 1) * 2 * Math.PI) * radius + 0.5,
                0.01
            )
        )),
        new THREE.LineBasicMaterial({
            color: 0xFFFF00
        })
    );
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xAAAAAA);

    const light = new THREE.DirectionalLight();
    light.position.set(0, 1, 2);
    scene.add(light);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0.5;
    camera.position.y = 0.5;
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

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

function onDocumentKeyDown(event) {
    if (event.which == 32) {
        scene.children = [];
        scene.add(circle(R))
        const l = randomLine(R);
        scene.add(toLineGeometry(l));
        triangles = triangles.map(t => cutTriangle(t, l)).flat();
        triangles.forEach(t => {
            const pt1 = intersect([t[0], t[1]], l);
            if (pt1 !== undefined) scene.add(toPoint(pt1, 0.01));
            const pt2 = intersect([t[1], t[2]], l);
            if (pt2 !== undefined) scene.add(toPoint(pt2, 0.01));
            const pt3 = intersect([t[2], t[0]], l);
            if (pt3 !== undefined) scene.add(toPoint(pt3, 0.01));
            let color = new THREE.Color();
            if (getSide(t, l)) {
                color.setHSL(Math.random() * 0.1, 0.5, 0.5);
            } else {
                color.setHSL(0.5 + Math.random() * 0.1, 0.5, 0.5);
            }
            let surface = new THREE.Mesh(
                toGeometry([t], color),
                new THREE.MeshBasicMaterial({
                    color: color
                })
            );
            scene.add(surface);
        });
    }
}

init();