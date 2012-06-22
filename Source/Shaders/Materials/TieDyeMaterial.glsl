uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_frequency;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 scaled = materialInput.str * u_frequency;
    float t = abs(agi_snoise(scaled));
    
    material.diffuse = mix(u_lightColor, u_darkColor, t).rgb;
    
    return material;
}
