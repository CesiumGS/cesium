    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "varying vec3 v_positionEC;\n\
varying vec3 v_normalEC;\n\
varying vec4 v_color;\n\
\n\
void main()\n\
{\n\
    vec3 positionToEyeEC = -v_positionEC;\n\
    \n\
	vec3 normalEC = normalize(v_normalEC);\n\
#ifdef FACE_FORWARD\n\
    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);\n\
#endif\n\
    \n\
    czm_materialInput materialInput;\n\
    materialInput.normalEC = normalEC;\n\
    materialInput.positionToEyeEC = positionToEyeEC;\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    material.diffuse = v_color.rgb;\n\
    material.alpha = v_color.a;\n\
    \n\
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);\n\
}\n\
";
});