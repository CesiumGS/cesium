uniform vec4 lightColor;
uniform vec4 darkColor;
uniform vec2 repeat;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    float b = mod(floor(repeat.s * st.s) + floor(repeat.t * st.t), 2.0);  // 0.0 or 1.0
    
    // Find the distance from the closest separator (region between two colors)
    float scaledWidth = fract(repeat.s * st.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));
    float scaledHeight = fract(repeat.t * st.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));
    float value = min(scaledWidth, scaledHeight);
    
    vec4 currentColor = mix(lightColor, darkColor, b);
    vec4 color = czm_antialias(lightColor, darkColor, currentColor, value, 0.03);
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
