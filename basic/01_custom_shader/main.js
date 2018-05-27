var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
document.body.appendChild( renderer.domElement );

var ambientLight = new THREE.AmbientLight(0x0000ff, 0.3);
scene.add( ambientLight );

//#region scene objects

//#region shaders
var vertexShader = `
varying vec2 vUV;

void main()
{
    vUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

var fragmentShader = `
uniform vec3 ambientLightColor;
uniform sampler2D map;
varying vec2 vUV;

void main()
{
    vec4 c = texture2D(map, vUV);
    c.rgb += ambientLightColor;
    gl_FragColor = c;
}`;
//#endregion

//#region shader error output with line number
var gl = renderer.context;
WebGLRenderingContext.prototype.compileShader = (function(origFn) {

    const errorRegex = /\d+:(\d+):/;

    return function(shader) {
        origFn.call(this, shader);  // call the original function
        const success = this.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            // add line numbers to shader
            const lines = this.getShaderSource(shader)
                .split('\n')
                .map(function(line, ndx) {
                    return `${ndx + 1}: ${line}`;
                });

            // get error messages
            const errors = this.getShaderInfoLog(shader);
      
            // insert the error messages into the lines.
            // Note: the code assumes the error messages
            // are in order of lowest line number to highest
            errors.split('\n').forEach(function(error, ndx) {
                // get line number for error
                const m = errorRegex.exec(error);
                const lineNum = Math.max(m ? parseInt(m[1]) : 0, 0);
       
                // insert error just before line the error happened on
                lines.splice(lineNum + ndx, 0, `${error}`);
            });
       
            console.error(lines.join('\n'));
        }
    }

}(WebGLRenderingContext.prototype.compileShader));
//#endregion

var cube;
var onTextureLoaded = function(texture) {
    const uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib['lights'],
        { map: { type: 't', value: texture } }
    ]);
    uniforms.map.value = texture;
    const geometry = new THREE.BoxGeometry( 2, 2, 2 );
    var material = new THREE.ShaderMaterial({
        lights: true,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
    
    cube = new THREE.Mesh( geometry, material );
    scene.add( cube );
}

var textureLoader = new THREE.TextureLoader();
textureLoader.load( 'resources/textures/crate0_diffuse.png',
    //on load
    onTextureLoaded,
    // onProgress callback currently not supported
    undefined,
    // onError callback
    function ( err ) {
        console.error( 'An error happened.' );
    }
);

//#endregion

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener( 'resize', onWindowResize, false );

var animate = function () {
    requestAnimationFrame( animate );

    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
};

animate();
