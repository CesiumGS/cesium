uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float offset;
uniform float repeat;
uniform bool horizontal;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)
    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.1;

    float coord = mix(materialInput.st.s, materialInput.st.t, float(horizontal));
    float value = fract((coord - offset) * (repeat * 0.5));
    
    //anti-aliasing
    float val1 = clamp(value / fuzz, 0.0, 1.0);
    float val2 = clamp((value - 0.5) / fuzz, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));

    vec4 color = mix(lightColor, darkColor, val1);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
