uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float offset;
uniform float repeat;
uniform bool horizontal;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)
    float coord = mix(materialInput.st.s, materialInput.st.t, float(horizontal));
    float value = fract((coord - offset) * (repeat * 0.5));
    float dist = min(value, min(abs(value - 0.5), 1.0 - value));
    
    vec4 currentColor = mix(lightColor, darkColor, step(0.5, value));
    vec4 color = czm_antialias(lightColor, darkColor, currentColor, dist);
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
