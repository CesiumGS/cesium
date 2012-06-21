/**
 * An agi_material with default values. Every material's agi_getMaterial
 * should use this default material as a base for the material it returns.
 *
 * @name agi_getDefaultMaterial
 * @glslFunction 
 *
 * @param {agi_materialInput} input The input used to construct the default material.
 * input.normalEC is the default normal component.
 * 
 * @returns {agi_material} The default material.
 *
 * @see agi_materialInput
 * @see agi_material
 * @see agi_getMaterial
 */
agi_material agi_getDefaultMaterial(agi_materialInput materialInput)
{
    agi_material material;
    material.diffuseComponent = vec3(0.0, 0.0, 0.0);
    material.specularComponent = 0.0;
    material.normalComponent = materialInput.normalEC;
    material.emissionComponent = vec3(0.0, 0.0, 0.0);
    material.alphaComponent = 1.0;
    return material;
}


