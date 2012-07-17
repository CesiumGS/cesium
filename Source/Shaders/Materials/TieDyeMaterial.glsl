uniform vec4 lightColor;
uniform vec4 darkColor;
uniform float frequency;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 scaled = materialInput.str * frequency;
    float t = abs(agi_snoise(scaled));
    
    vec4 color = mix(lightColor, darkColor, t);
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}
