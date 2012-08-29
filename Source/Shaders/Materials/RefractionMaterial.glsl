uniform samplerCube cubeMap;
uniform float indexOfRefractionRatio;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec3 normalWC = normalize(czm_inverseViewRotation * material.normal);
    vec3 positionWC = normalize(czm_inverseViewRotation * materialInput.positionToEyeEC);
    vec3 refractedWC = refract(positionWC, -normalWC, indexOfRefractionRatio);
    material.diffuse = textureCube(cubeMap, refractedWC).channels;

    return material;
}