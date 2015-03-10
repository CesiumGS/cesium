    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Calculates the specular intensity of reflected light.\n\
 *\n\
 * @name czm_getSpecular\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.\n\
 * @param {vec3} toEyeEC Unit vector pointing to the eye position in eye coordinates.\n\
 * @param {vec3} normalEC The surface normal in eye coordinates.\n\
 * @param {float} shininess The sharpness of the specular reflection.  Higher values create a smaller, more focused specular highlight.\n\
 *\n\
 * @returns {float} The intensity of the specular highlight.\n\
 *\n\
 * @see czm_phong\n\
 *\n\
 * @example\n\
 * float diffuseIntensity = czm_getLambertDiffuse(lightDirectionEC, normalEC);\n\
 * float specularIntensity = czm_getSpecular(lightDirectionEC, toEyeEC, normalEC, 200);\n\
 * vec3 color = (diffuseColor * diffuseIntensity) + (specularColor * specularIntensity);\n\
 */\n\
float czm_getSpecular(vec3 lightDirectionEC, vec3 toEyeEC, vec3 normalEC, float shininess)\n\
{\n\
    vec3 toReflectedLight = reflect(-lightDirectionEC, normalEC);\n\
    float specular = max(dot(toReflectedLight, toEyeEC), 0.0);\n\
    return pow(specular, shininess);\n\
}";
});