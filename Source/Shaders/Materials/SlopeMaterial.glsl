czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse =  mix(vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), materialInput.slope);
    return material;
}