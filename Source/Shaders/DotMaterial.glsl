uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform vec2 u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = smoothstep(0.3, 0.32, length(fract(u_repeat * st) - 0.5));  // 0.0 or 1.0

    return mix(u_lightColor, u_darkColor, b);
}
