uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_offset;
uniform float u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)
    
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.1;
    
    // Controls the width of the light vs. dark stripes
    const float width = 0.5;
    
    float scaled = fract((st.s - u_offset) * (u_repeat * 0.5));
    
    float frac1 = clamp(scaled / fuzz, 0.0, 1.0);
    float frac2 = clamp((scaled - width) / fuzz, 0.0, 1.0);
    
    frac1 = frac1 * (1.0 - frac2);
    frac1 = frac1 * frac1 * (3.0 - (2.0 * frac1));
    
    return mix(u_lightColor, u_darkColor, frac1);
}
