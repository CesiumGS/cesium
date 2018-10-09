//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * An czm_material with default values. Every material's czm_getMaterial\n\
 * should use this default material as a base for the material it returns.\n\
 * The default normal value is given by materialInput.normalEC.\n\
 *\n\
 * @name czm_getDefaultMaterial\n\
 * @glslFunction\n\
 *\n\
 * @param {czm_materialInput} input The input used to construct the default material.\n\
 *\n\
 * @returns {czm_material} The default material.\n\
 *\n\
 * @see czm_materialInput\n\
 * @see czm_material\n\
 * @see czm_getMaterial\n\
 */\n\
czm_material czm_getDefaultMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material;\n\
    material.diffuse = vec3(0.0);\n\
    material.specular = 0.0;\n\
    material.shininess = 1.0;\n\
    material.normal = materialInput.normalEC;\n\
    material.emission = vec3(0.0);\n\
    material.alpha = 1.0;\n\
    return material;\n\
}\n\
";
});