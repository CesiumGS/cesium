uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_offset;
uniform float u_repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.1;

    float value = fract((materialInput.st.s - u_offset) * (u_repeat * 0.5));
    
    //anti-aliasing
    float val1 = clamp(value / fuzz, 0.0, 1.0);
    float val2 = clamp((value - 0.5) / fuzz, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));
    
    vec4 color = mix(u_lightColor, u_darkColor, val1);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
