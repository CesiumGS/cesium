//This file is automatically rebuilt by the Cesium build process.
export default "#define SAMPLES 8\n\
\n\
uniform float delta;\n\
uniform float sigma;\n\
uniform float direction; // 0.0 for x direction, 1.0 for y direction\n\
\n\
uniform sampler2D colorTexture;\n\
\n\
#ifdef USE_STEP_SIZE\n\
uniform float stepSize;\n\
#else\n\
uniform vec2 step;\n\
#endif\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
//  Incremental Computation of the Gaussian:\n\
//  https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch40.html\n\
\n\
void main()\n\
{\n\
    vec2 st = v_textureCoordinates;\n\
    vec2 dir = vec2(1.0 - direction, direction);\n\
\n\
#ifdef USE_STEP_SIZE\n\
    vec2 step = vec2(stepSize * (czm_pixelRatio / czm_viewport.zw));\n\
#else\n\
    vec2 step = step;\n\
#endif\n\
\n\
    vec3 g;\n\
    g.x = 1.0 / (sqrt(czm_twoPi) * sigma);\n\
    g.y = exp((-0.5 * delta * delta) / (sigma * sigma));\n\
    g.z = g.y * g.y;\n\
\n\
    vec4 result = texture2D(colorTexture, st) * g.x;\n\
    for (int i = 1; i < SAMPLES; ++i)\n\
    {\n\
        g.xy *= g.yz;\n\
\n\
        vec2 offset = float(i) * dir * step;\n\
        result += texture2D(colorTexture, st - offset) * g.x;\n\
        result += texture2D(colorTexture, st + offset) * g.x;\n\
    }\n\
\n\
    gl_FragColor = result;\n\
}\n\
";
