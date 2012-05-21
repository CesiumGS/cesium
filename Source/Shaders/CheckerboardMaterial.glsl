uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform vec2 u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.03;
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = mod(floor(u_repeat.s * st.s) + floor(u_repeat.t * st.t), 2.0);  // 0.0 or 1.0
    
    // Find the distance from the closest separator (region between two colors)
    float scaledWidth = fract(u_repeat.s * st.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + .5));
    float scaledHeight = fract(u_repeat.t * st.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + .5));
    float scaled = min(scaledWidth,scaledHeight);
    
    //anti-aliasing
    float interpValue = b*agi_getInterpolatedAntialiasedValue(scaled,fuzz);
    
    return mix(u_lightColor, u_darkColor, interpValue);
}
