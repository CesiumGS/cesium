#define SAMPLES 8

uniform float u_delta;
uniform float u_sigma;
uniform float u_direction; // 0.0 for x direction, 1.0 for y direction

uniform sampler2D u_colorTexture;

#ifdef USE_KERNEL_SIZE
uniform float u_kernelSize;
#else
uniform vec2 u_step;
#endif

varying vec2 v_textureCoordinates;

//  Incremental Computation of the Gaussian:
//  http://http.developer.nvidia.com/GPUGems3/gpugems3_ch40.html

void main()
{
    vec2 st = v_textureCoordinates;
    vec2 dir = vec2(1.0 - u_direction, u_direction);

#ifdef USE_KERNEL_SIZE
    vec2 step = vec2(u_kernelSize / czm_viewport.zw);
#else
    vec2 step = u_step;
#endif

    vec3 g;
    g.x = 1.0 / (sqrt(czm_twoPi) * u_sigma);
    g.y = exp((-0.5 * u_delta * u_delta) / (u_sigma * u_sigma));
    g.z = g.y * g.y;

    vec4 result = texture2D(u_colorTexture, st) * g.x;
    for (int i = 1; i < SAMPLES; ++i)
    {
        g.xy *= g.yz;

        vec2 offset = float(i) * dir * step;
        result += texture2D(u_colorTexture, st - offset) * g.x;
        result += texture2D(u_colorTexture, st + offset) * g.x;
    }

    gl_FragColor = result;
}
