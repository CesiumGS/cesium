czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(czm_inverseViewRotation * normalEC);
    float cosAngIncidence = max(dot(normalWC, materialInput.positionToEyeWC), 0.0);
    
    material.diffuse = mix(reflection.diffuse, refraction.diffuse, cosAngIncidence);
    
    return material;
}
