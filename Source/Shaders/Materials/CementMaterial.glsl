uniform vec4 cementColor;
uniform float grainScale;
uniform float roughness;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float noise = czm_snoise(materialInput.st / grainScale);
    noise = pow(noise, 5.0) * roughness;
   
    vec4 color = cementColor;
    color.rgb += noise;
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}