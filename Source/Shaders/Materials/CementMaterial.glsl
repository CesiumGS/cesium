uniform vec4 cementColor;
uniform float grainScale;
uniform float roughness;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    float noise = agi_snoise(materialInput.st / grainScale);
    noise = pow(noise, 5.0) * roughness;
   
    vec4 color = cementColor + noise;
    color.w = 1.0;
    
    material.diffuse = color.rgb;
    
    return material;
}