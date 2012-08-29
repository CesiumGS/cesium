uniform samplerCube cubeMap;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 normalWC = normalize(czm_inverseViewRotation * material.normal);
    vec3 positionWC = normalize(czm_inverseViewRotation * materialInput.positionToEyeEC);
    vec3 reflectedWC = reflect(positionWC, normalWC);
    material.diffuse = textureCube(cubeMap, reflectedWC).channels;

    return material;
}