function init() {
    //scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);

    //camera
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.z = 20;
    camera.position.x = 20;
    camera.position.y = 20;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);//add camera to scene

    //renderer
    var renderer = new THREE.WebGLRenderer();
    renderer.gammaFactor = 2.0;
    renderer.gammaOutput = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    //ambient
    scene.add(new THREE.AmbientLight(0x404040));

    //directional light
    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 500, 0); // CHANGED
    light.castShadow = true;            // default false
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.left = -1400; // or whatever value works for the scale of your scene
    light.shadow.camera.right = 1400;
    light.shadow.camera.top = 1400;
    light.shadow.camera.bottom = -1400;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 3000;
    scene.add(light);
    var directionalLightHelper = new THREE.DirectionalLightHelper(light, 50);
    scene.add(directionalLightHelper);

    //axes helper
    var axes = new THREE.AxesHelper(1000);
    scene.add(axes);

    //orbit control
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);

    function drawNormal(arrowHelper, normal, position) {
        if (arrowHelper == undefined) { throw 'error'; }
        arrowHelper.position.copy(position);
        arrowHelper.setDirection(normal);
    }

    // planeA
    let planeA; //A0*(x-x0) + B0*(y-y0) + C0*(z-z0) = 0
    let normalA; //(A0, B0, C0)
    let pointA; //(x0, y0, z0)
    let originalNormalA = new THREE.Vector3(0, 0, 1);
    let arrowHelperA;
    {
        //plane
        let geometry = new THREE.PlaneBufferGeometry(5, 20, 32);
        let material = new THREE.MeshLambertMaterial({ color: 0xAA1100, side: THREE.DoubleSide });
        planeA = new THREE.Mesh(geometry, material);

        //point (attached to the plane)
        pointA = new THREE.Object3D();
        pointA.position.set(0, 0, 0);
        planeA.add(pointA);

        planeA.position.set(0, 0, -5);
        planeA.updateMatrixWorld();

        scene.add(planeA);

        //normal
        normalA = new THREE.Vector3();
        normalA.copy(originalNormalA);
        var quat = new THREE.Quaternion();
        planeA.getWorldQuaternion(quat);
        normalA.applyQuaternion(quat);
        arrowHelperA = new THREE.ArrowHelper(normalA, planeA.position, 10, 0xFF0000);
        drawNormal(arrowHelperA, normalA, planeA.position);

        scene.add(arrowHelperA);
    }

    // planeB
    let planeB; //A1*(x-x1) + B1*(y-y1) + C1*(z-z1) = 0
    let normalB; //(A1, B1, C1)
    let pointB; //(x1, y1, z1)
    let originalNormalB = new THREE.Vector3(0, 0, 1);
    let arrowHelperB;
    {
        //plane
        let geometry = new THREE.PlaneBufferGeometry(5, 20, 32);
        let material = new THREE.MeshLambertMaterial({ color: 0x0011AA, side: THREE.DoubleSide });
        planeB = new THREE.Mesh(geometry, material);
        planeB.rotateX(Math.PI * 30 / 180.0);

        //point (attached to the plane)
        pointB = new THREE.Object3D();
        pointB.position.set(0, 0, 0);
        planeB.add(pointB);
        planeB.updateMatrixWorld();

        scene.add(planeB);

        //normal
        normalB = new THREE.Vector3();
        normalB.copy(originalNormalB);
        var quat = new THREE.Quaternion();
        planeB.getWorldQuaternion(quat);
        normalB.applyQuaternion(quat);
        arrowHelperB = new THREE.ArrowHelper(normalB, planeB.position, 10, 0x0000FF);
        drawNormal(arrowHelperB, normalB, planeB.position);

        scene.add(arrowHelperB);
    }

    /**
     * @param {{normal: THREE.Vector3, point: THREE.Object3D}} planeA
     * @param {{normal: THREE.Vector3, point: THREE.Object3D}} planeB
     * @param {THREE.Vector3} out_point a point on the insection line
     * @param {THREE.Vector3} out_dir the direction of the insection line
     */
    function IntersectTwoPlanes(planeA, planeB, out_point, out_dir) {
        const normalA = planeA.normal;
        const pointA = planeA.point;
        const normalB = planeB.normal;
        const pointB = planeB.point;

        const A0 = normalA.x;
        const B0 = normalA.y;
        const C0 = normalA.z;
        const pointAPosition = new THREE.Vector3();
        pointA.getWorldPosition(pointAPosition);
        const x0 = pointAPosition.x;
        const y0 = pointAPosition.y;
        const z0 = pointAPosition.z;
        // D0 = A0 * x0 + B0 * y0 + C0 * z0

        const A1 = normalB.x;
        const B1 = normalB.y;
        const C1 = normalB.z;
        const pointBPosition = new THREE.Vector3();
        pointB.getWorldPosition(pointBPosition);
        const x1 = pointBPosition.x;
        const y1 = pointBPosition.y;
        const z1 = pointBPosition.z;
        // D1 = A1 * x1 + B1 * y1 + C1 * z1

        //https://stackoverflow.com/a/32410473/3427520
        // Intersection of 2-planes: a variation based on the 3-plane version.
        // see: Graphics Gems 1 pg 305
        //
        // Note that the 'normal' components of the planes need not be unit length
        function isect_plane_plane_to_normal_ray(
            p1, p2,
            // output args
            r_point, r_normal) {

            // logically the 3rd plane, but we only use the normal component.
            const p3_normal = new THREE.Vector3();
            p3_normal.crossVectors(p1.normal, p2.normal);
            const det = p3_normal.lengthSq();

            // If the determinant is 0, that means parallel planes, no intersection.
            // note: you may want to check against an epsilon value here.
            if (Math.abs(det) > 0.001) {
                // calculate the final (point, normal)
                r_point.set(0, 0, 0);
                const t0 = p3_normal.clone();
                t0.cross(p2.normal).multiplyScalar(p1.d);
                const t1 = p1.normal.clone();
                t1.cross(p3_normal).multiplyScalar(p2.d);
                r_point.addVectors(t0, t1);
                r_point.divideScalar(det);
                r_normal.copy(p3_normal);
                return true;
            }
            else {
                return false;
            }
        }

        const p = new THREE.Vector3();
        const n = new THREE.Vector3();
        const intersected = isect_plane_plane_to_normal_ray(
            {
                normal: normalA,
                d: -(A0 * x0 + B0 * y0 + C0 * z0),//D0
            },
            {
                normal: normalB,
                d: -(A1 * x1 + B1 * y1 + C1 * z1),//D1
            },
            p, n
        );

        if (intersected) {
            out_point.copy(p);
            out_dir.copy(n);
            return true;
        }
        else {
            return false;
        }
    }

    let intersectionLineGeometry;
    {
        let material = new THREE.LineBasicMaterial({ color: 0x331F00 });
        intersectionLineGeometry = new THREE.Geometry();
        intersectionLineGeometry.vertices.push(new THREE.Vector3());
        intersectionLineGeometry.vertices.push(new THREE.Vector3());
        let line = new THREE.Line(intersectionLineGeometry, material);
        scene.add(line);
    }

    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    var gui = new dat.GUI({ width: 350 });
    gui.add(axes, 'visible').name('axes');

    var p = new THREE.Vector3();
    var n = new THREE.Vector3();
    function render() {
        requestAnimationFrame(render);

        //rotates two planes
        planeA.rotation.x += 0.005;
        planeA.rotation.y += 0.01;
        
        planeB.rotation.x += 0.01;
        planeB.rotation.y += 0.005;

        //calculate and draw plane normals
        normalA.copy(originalNormalA);
        const planeAQuat = new THREE.Quaternion();
        planeA.getWorldQuaternion(planeAQuat);
        normalA.applyQuaternion(planeAQuat);

        normalB.copy(originalNormalB);
        const planeBQuat = new THREE.Quaternion();
        planeB.getWorldQuaternion(planeBQuat);
        normalB.applyQuaternion(planeBQuat);

        drawNormal(arrowHelperA, normalA, planeA.position);
        drawNormal(arrowHelperB, normalB, planeB.position);

        //calculate the intersection line of two planes
        IntersectTwoPlanes(
            {
                normal: normalA,
                point: pointA
            },
            {
                normal: normalB,
                point: pointB
            },
            p, n
        );

        const ray = new THREE.Ray(p, n);
        const p0 = new THREE.Vector3();
        const p1 = new THREE.Vector3();
        ray.at(-100, p0);
        ray.at(100, p1);

        //update line geometry
        intersectionLineGeometry.vertices[0].copy(p0);
        intersectionLineGeometry.vertices[1].copy(p1);
        intersectionLineGeometry.verticesNeedUpdate = true;

        orbit.update();

        renderer.render(scene, camera);
    }

    render();

}
window.onload = init;