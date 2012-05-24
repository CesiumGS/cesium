uniform vec4 u_cementColor;
uniform float u_grainScale;
uniform float u_roughness;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    float noise = agi_snoise(st * u_grainScale);
    noise = pow(noise, 5.0) * u_roughness;
   
    vec4 color = u_cementColor + noise;
    
    color.w = 1.0;
    return color;
}