uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_offset;
uniform float u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)
    
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.1;

    float scaled = fract((st.s - u_offset) * (u_repeat * 0.5));
    
    float interpValue = agi_getInterpolatedAntialiasedValue(scaled, fuzz);

    return mix(u_lightColor, u_darkColor, interpValue);
}
