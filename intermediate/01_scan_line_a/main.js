var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 100;

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
precision highp float;
uniform float time;
uniform float ratio;
varying vec2 vUV;

// by srtuss, 2013
// was trying to find some sort of "mechanical" fractal for texture/heightmap
// generation, but then i ended up with this.

// rotate position around axis
vec2 rotate(vec2 p, float a)
{
	return vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
}

// 1D random numbers
float rand(float n)
{
    return fract(sin(n) * 43758.5453123);
}

// 2D random numbers
vec2 rand2(in vec2 p)
{
	return fract(vec2(sin(p.x * 591.32 + p.y * 154.077), cos(p.x * 391.32 + p.y * 49.077)));
}

// 1D noise
float noise1(float p)
{
	float fl = floor(p);
	float fc = fract(p);
	return mix(rand(fl), rand(fl + 1.000004), fc);
}

// voronoi distance noise, based on iq's articles
float voronoi(in vec2 x)
{
	vec2 p = floor(x);
	vec2 f = fract(x);
	
	vec2 res = vec2(8.0);
	for(int j = -1; j <= 1; j ++)
	{
		for(int i = -1; i <= 1; i ++)
		{
			vec2 b = vec2(i, j);
			vec2 r = vec2(b) - f + rand2(p + b);
			
			// chebyshev distance, one of many ways to do this
			float d = max(abs(r.x), abs(r.y));
			
			if(d < res.x)
			{
				res.y = res.x;
				res.x = d;
			}
			else if(d < res.y)
			{
				res.y = d;
			}
		}
	}
	return res.y - res.x;
}


//float flicker = noise1(time * 2.0) * 0.8 + 0.4;

void main(void)
{
    vec2 uv = -1.0 + 2.0 *vUV;
	uv = (uv - 0.5) * 2.0;
	vec2 suv = uv;
	uv.x *= ratio;
	
	
	float v = 0.0;
	
	// that looks highly interesting:
	v = 0.3 - length(uv) * 0.3;
	
	
	// a bit of camera movement
	uv *= 0.6 + sin(time * 0.03) * 0.4;
	uv = rotate(uv, sin(time * 0.1) * 1.0);
	uv += time * 0.03;
	
	
	// add some noise octaves
	float a = 0.6, f = 1.0;
	
	for(int i = 0; i < 3; i ++) // 4 octaves also look nice, its getting a bit slow though
	{	
		float v1 = voronoi(uv * f + 5.0);
		float v2 = 0.0;
		
		// make the moving electrons-effect for higher octaves
		if(i > 0)
		{
			// of course everything based on voronoi
			v2 = voronoi(uv * f * 0.5 + 50.0 + time);
			
			float va = 0.0, vb = 0.0;
			va = 1.0 - smoothstep(0.0, 0.1, v1);
			vb = 1.0 - smoothstep(0.0, 0.08, v2);
			v += a * pow(va * (0.5 + vb), 2.0);
		}
		
		// make sharp edges
		v1 = 1.0 - smoothstep(0.0, 0.3, v1);
		
		// noise is used as intensity map
		v2 = a * (noise1(v1 * 5.5 + 0.1));
		
		// octave 0's intensity changes a bit
		if(i == 0)
			//v += v2 * flicker;
		//else
			v += v2;
		
		f *= 3.0;
		a *= 0.7;
	}

	// slight vignetting
	v *= exp(-0.6 * length(suv)) * 1.2;
	
	// use texture channel0 for color? why not.
	//vec3 cexp = texture2D(iChannel0, uv * 0.001).xyz * 3.0 + texture2D(iChannel0, uv * 0.01).xyz;//vec3(1.0, 2.0, 4.0);
	
	// old blueish color st
	vec3 cexp = vec3(3, .7, 2);
		cexp *= 1.3;

	vec3 col = vec3(pow(v, cexp.x), pow(v, cexp.y), pow(v, cexp.z)) * 2.0;
	
	gl_FragColor = vec4(col, 1.0);
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

const planeWidth = 700;
const planeHeight = 394;
const uniforms = THREE.UniformsUtils.merge([
    {time: { type: 'f', value: 0.1 } },
    {ratio: {type: 'f', value: planeWidth/planeHeight} }
]);
const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
var material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms
});

var planeMesh = new THREE.Mesh( geometry, material );
scene.add( planeMesh );

var clock = new THREE.Clock();

//#endregion

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    
}

window.addEventListener( 'resize', onWindowResize, false );

var animate = function () {
    requestAnimationFrame( animate );

    if (material) {
        material.uniforms.time.value += clock.getDelta();
    }

    renderer.render(scene, camera);
};

animate();
