    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform samplerCube u_cubeMap;\n\
\n\
varying vec3 v_texCoord;\n\
\n\
void main()\n\
{\n\
    vec3 rgb = textureCube(u_cubeMap, normalize(v_texCoord)).rgb;\n\
    gl_FragColor = vec4(rgb, czm_morphTime);\n\
}\n\
";
});