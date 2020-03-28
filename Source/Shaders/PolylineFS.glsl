#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_st;

void main()
{
    czm_materialInput materialInput;

    vec2 stNoPerspective = v_st * gl_FragCoord.w;
    materialInput.s = stNoPerspective.s;
    materialInput.st = stNoPerspective;
    materialInput.str = vec3(stNoPerspective, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#ifdef VECTOR_TILE
    gl_FragColor *= u_highlightColor;
#endif

    czm_writeLogDepth();
}
