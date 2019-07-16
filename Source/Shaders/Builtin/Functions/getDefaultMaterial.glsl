/**
 * An czm_material with default values. Every material's czm_getMaterial
 * should use this default material as a base for the material it returns.
 * The default normal value is given by materialInput.normalEC.
 *
 * @name czm_getDefaultMaterial
 * @glslFunction 
 *
 * @param {czm_materialInput} input The input used to construct the default material.
 * 
 * @returns {czm_material} The default material.
 *
 * @see czm_materialInput
 * @see czm_material
 * @see czm_getMaterial
 */
czm_material czm_getDefaultMaterial(czm_materialInput materialInput)
{
    czm_material material;
    material.diffuse = vec3(0.0);
    material.specular = 0.0;
    material.shininess = 1.0;
    material.normal = materialInput.normalEC;
    material.emission = vec3(0.0);
    material.alpha = 1.0;
    return material;
}
