uniform samplerCube cubeMap;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(czm_inverseViewRotation * normalEC);
    vec3 reflectedWC = reflect(materialInput.positionToEyeWC, normalWC);
    material.diffuse = textureCube(cubeMap, reflectedWC).channels;

    return material;
}