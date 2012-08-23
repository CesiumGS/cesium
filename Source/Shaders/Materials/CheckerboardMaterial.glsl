uniform vec4 lightColor;
uniform vec4 darkColor;
uniform vec2 repeat;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // Fuzz Factor - Controls blurriness between light and dark colors
    vec2 st = materialInput.st;
    const float fuzz = 0.03;
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = mod(floor(repeat.s * st.s) + floor(repeat.t * st.t), 2.0);  // 0.0 or 1.0
    
    // Find the distance from the closest separator (region between two colors)
    float scaledWidth = fract(repeat.s * st.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));
    float scaledHeight = fract(repeat.t * st.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));
    float value = min(scaledWidth, scaledHeight);
    
    //anti-aliasing
    float val1 = clamp(value / fuzz, 0.0, 1.0);
    float val2 = clamp((value - 0.5) / fuzz, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));
    val1 = pow(val1, 0.5); //makes the transition nicer
    
    vec4 midColor = (lightColor + darkColor) / 2.0;
    vec4 currentColor = mix(lightColor, darkColor, b);
    
    vec4 color = mix(midColor, currentColor, val1);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
