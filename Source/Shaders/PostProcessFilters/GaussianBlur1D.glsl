// TODO: make uniforms
//uniform float radius;    // 16.0
uniform float delta;     // 1.0
uniform float sigma;     // 2.0
uniform float direction; // 0.0 for x direction, 1.0 for y direction

//  Incremental Computation of the Gaussian:
//  http://http.developer.nvidia.com/GPUGems3/gpugems3_ch40.html

/*
vec4 czm_getFilter(czm_FilterInput filterInput)
{
    int samples = radius / 2;
    vec2 dir = vec2(1.0 - direction, direction);
    
    vec3 g;
    g.x = 1.0 / (sqrt(czm_twoPi) * sigma);
    g.y = exp((-0.5 * delta * delta) / (sigma * sigma));
    g.z = g.y * g.y;
    
    vec4 result = texture2D(czm_color, filterInput.st) * g.x; 
    for (int i = 1; i < samples; ++i) {
        g.xy *= g.yz;
        
        vec2 offset = float(i) * dir * filterInput.colorStep;
        result += texture2D(czm_color, filterInput.st - offset) * g.x;
        result += texture2D(czm_color, filterInput.st + offset) * g.x;
    }
    
    return result;
}
*/

#define SAMPLES 9

uniform sampler2D u_texture;
uniform vec2 u_step;

varying vec2 v_textureCoordinates;

void main()
{
    vec2 st = v_textureCoordinates;
    
    //int samples = int(radius) / 2;
    vec2 dir = vec2(1.0 - direction, direction);
    
    vec3 g;
    g.x = 1.0 / (sqrt(czm_twoPi) * sigma);
    g.y = exp((-0.5 * delta * delta) / (sigma * sigma));
    g.z = g.y * g.y;
    
    vec4 result = texture2D(u_texture, st) * g.x; 
    //for (int i = 1; i < samples; ++i) {
    for (int i = 1; i < SAMPLES; ++i)
    {
        g.xy *= g.yz;
        
        vec2 offset = float(i) * dir * u_step;
        result += texture2D(u_texture, st - offset) * g.x;
        result += texture2D(u_texture, st + offset) * g.x;
    }
    
    gl_FragColor = result;
}
