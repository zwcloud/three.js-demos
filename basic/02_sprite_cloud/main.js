function init() {
    //scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color('rgb(69,132,180)');

    //camera
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.z = 20;
    camera.position.x = 20;
    camera.position.y = 20;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    //renderer
    var renderer = new THREE.WebGLRenderer();
    renderer.gammaFactor = 2.0;
    renderer.gammaOutput = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild( renderer.domElement );

    //orbit control
    var orbit = new THREE.OrbitControls(camera, renderer.domElement);

    //cloud
    function randomRange(min, max) {
        return min + (max - min) * Math.random();
    }
    /**
     * Creates a single cloud group and adds several cloud layers.
     * Each cloud layer has random position ( x, y, z ), rotation (a)
     * and rotation speed (s).
     * @param params {{clusterRange: Number, minNumber: Number, maxNumber: Number, size: Number}}
     * @return a THREE.Object3D contains all the cloud sprites.
     */
    function createCloudGroup(params) {
        let clusterRange = params.clusterRange || 0.5;
        let minNumber = params.minNumber || 5;
        let maxNumber = params.maxNumber || 10;
        let size = params.size || 256;

        let cloudGroup = new THREE.Group();

        let cloudMaterial = new THREE.SpriteMaterial({ transparent: true, opacity: 0.7 });
        let cloudTextureLoader = new THREE.TextureLoader();
        cloudTextureLoader.load('resources/cloud.png', function (texture) {
            cloudMaterial.map = texture;
            cloudMaterial.needsUpdate = true;
        });

        for (var j = 0; j < minNumber + Math.round(Math.random() * (maxNumber - minNumber)); j++) {

            let cloudSprite = new THREE.Sprite(cloudMaterial);
            var x = randomRange(-size, size) * clusterRange;
            var y = randomRange(-size, size) * clusterRange;
            var z = randomRange(-size * 100.0 / 256.0, size * 100.0 / 256.0);
            var a = Math.random() * Math.PI * 2;
            var s = (0.25 + Math.random() * 0.75) * size;
            cloudSprite.data = {
                x: x,
                y: y,
                z: z,
                a: a,
                s: s,
                speed: 0.1 * Math.random() * Math.PI / 180
            };
            cloudSprite.position.set(x, y, z);
            cloudSprite.rotateZ(a);
            cloudSprite.scale.set(s, s, 1);

            cloudGroup.add(cloudSprite);
        }
        return cloudGroup;
    }
    let cloudGroup = createCloudGroup({
        clusterRange: 0.5,
        minNumber: 15,
        maxNumber: 20,
        size: 60
    });
    scene.add(cloudGroup);

    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function render() {
        requestAnimationFrame(render);

        orbit.update();

        renderer.render(scene, camera);
    }

    render();

}
window.onload = init;