uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_frequency;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    vec3 scaled = str / u_frequency;
    float t = abs(agi_snoise(scaled));
    
    return mix(u_lightColor, u_darkColor, t);
}
