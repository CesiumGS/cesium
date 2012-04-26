uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    vec2 F = agi_cellular(st * u_repeat);
    float t = 1.0 - F.x*F.x;
        
    return mix(u_lightColor, u_darkColor, t);
}
