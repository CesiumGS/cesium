uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float frequency;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 scaled = materialInput.str * frequency;
    float t = abs(czm_snoise(scaled));
    
    vec4 color = mix(lightColor, darkColor, t);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
