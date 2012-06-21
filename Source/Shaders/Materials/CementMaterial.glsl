uniform vec4 u_cementColor;
uniform float u_grainScale;
uniform float u_roughness;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    float noise = agi_snoise(materialInput.st / u_grainScale);
    noise = pow(noise, 5.0) * u_roughness;
   
    vec4 color = u_cementColor + noise;
    color.w = 1.0;
    
    material.diffuseComponent = color.rgb;
    
    return material;
}