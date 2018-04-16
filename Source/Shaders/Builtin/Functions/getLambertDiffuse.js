//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Calculates the intensity of diffusely reflected light.\n\
 *\n\
 * @name czm_getLambertDiffuse\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.\n\
 * @param {vec3} normalEC The surface normal in eye coordinates.\n\
 *\n\
 * @returns {float} The intensity of the diffuse reflection.\n\
 *\n\
 * @see czm_phong\n\
 *\n\
 * @example\n\
 * float diffuseIntensity = czm_getLambertDiffuse(lightDirectionEC, normalEC);\n\
 * float specularIntensity = czm_getSpecular(lightDirectionEC, toEyeEC, normalEC, 200);\n\
 * vec3 color = (diffuseColor * diffuseIntensity) + (specularColor * specularIntensity);\n\
 */\n\
float czm_getLambertDiffuse(vec3 lightDirectionEC, vec3 normalEC)\n\
{\n\
    return max(dot(lightDirectionEC, normalEC), 0.0);\n\
}\n\
";
});