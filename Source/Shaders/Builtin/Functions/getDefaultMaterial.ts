//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "czm_material czm_getDefaultMaterial(czm_materialInput materialInput)\n\
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