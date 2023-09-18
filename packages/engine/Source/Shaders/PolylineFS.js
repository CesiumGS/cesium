//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
\n\
in vec2 v_st;\n\
\n\
void main()\n\
{\n\
    czm_materialInput materialInput;\n\
\n\
    vec2 st = v_st;\n\
    st.t = czm_readNonPerspective(st.t, gl_FragCoord.w);\n\
\n\
    materialInput.s = st.s;\n\
    materialInput.st = st;\n\
    materialInput.str = vec3(st, 0.0);\n\
\n\
    czm_material material = czm_getMaterial(materialInput);\n\
    out_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#ifdef VECTOR_TILE\n\
    out_FragColor *= u_highlightColor;\n\
#endif\n\
\n\
    czm_writeLogDepth();\n\
}\n\
";
