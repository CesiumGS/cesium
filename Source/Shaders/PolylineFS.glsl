#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_st;

void main()
{
    czm_materialInput materialInput;

    materialInput.s = v_st.s;
    materialInput.st = v_st;
    materialInput.str = vec3(v_st, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#ifdef VECTOR_TILE
    gl_FragColor *= u_highlightColor;
#endif

    czm_writeLogDepth();
}
