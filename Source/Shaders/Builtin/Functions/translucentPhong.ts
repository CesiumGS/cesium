//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_translucentPhong(vec3 toEye, czm_material material)\n\
{\n\
float diffuse = czm_getLambertDiffuse(vec3(0.0, 0.0, 1.0), material.normal);\n\
if (czm_sceneMode == czm_sceneMode3D) {\n\
diffuse += czm_getLambertDiffuse(vec3(0.0, 1.0, 0.0), material.normal);\n\
}\n\
diffuse = clamp(diffuse, 0.0, 1.0);\n\
float specular = czm_getSpecular(czm_sunDirectionEC, toEye, material.normal, material.shininess);\n\
specular += czm_getSpecular(czm_moonDirectionEC, toEye, material.normal, material.shininess);\n\
vec3 materialDiffuse = material.diffuse * 0.5;\n\
vec3 ambient = materialDiffuse;\n\
vec3 color = ambient + material.emission;\n\
color += materialDiffuse * diffuse;\n\
color += material.specular * specular;\n\
return vec4(color, material.alpha);\n\
}\n\
";
});