#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

varying vec2 v_st;
varying vec4 v_position;

void main()
{
    czm_materialInput materialInput;
    
    materialInput.s = v_st.s;
    materialInput.st = v_st;
    materialInput.str = vec3(v_st, 0.0);
    
    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
    czm_logDepth(-v_position.z);
}
