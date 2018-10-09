//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
\n\
varying vec2 v_st;\n\
\n\
void main()\n\
{\n\
    czm_materialInput materialInput;\n\
\n\
    materialInput.s = v_st.s;\n\
    materialInput.st = v_st;\n\
    materialInput.str = vec3(v_st, 0.0);\n\
\n\
    czm_material material = czm_getMaterial(materialInput);\n\
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#ifdef VECTOR_TILE\n\
    gl_FragColor *= u_highlightColor;\n\
#endif\n\
\n\
    czm_writeLogDepth();\n\
}\n\
";
});