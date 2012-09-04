czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 normalWC = normalize(czm_inverseViewRotation * material.normal);
    vec3 positionWC = normalize(czm_inverseViewRotation * materialInput.positionToEyeEC);
    float cosAngIncidence = max(dot(normalWC, positionWC), 0.0);
    
    material.diffuse = mix(reflection.diffuse, refraction.diffuse, cosAngIncidence);
    
    return material;
}
