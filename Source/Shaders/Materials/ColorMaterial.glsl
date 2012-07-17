/**
 * Calculates material properties. The returned material should use the default material as a base.
 *
 * @name agi_getMaterial
 * @glslFunction 
 *
 * @param {agi_materialInput} input The input used to construct the material.
 * 
 * @returns {agi_material} The material.
 *
 * @example
 * agi_material material = agi_getDefaultMaterial(materialInput);
 * material.diffuse = vec3(1.0, 0.0, 0.0);
 * return material;
 *
 * @see agi_materialInput
 * @see agi_material
 * @see agi_getDefaultMaterial
 */
 
uniform vec4 color;
 
agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}