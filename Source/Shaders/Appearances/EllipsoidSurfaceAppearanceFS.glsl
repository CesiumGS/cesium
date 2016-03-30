varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_st;

void main()
{
    czm_materialInput materialInput;
    
    vec3 normalEC = normalize(czm_normal3D * czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));
#ifdef FACE_FORWARD
    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
#endif
    
    materialInput.s = v_st.s;
    materialInput.st = v_st;
    materialInput.str = vec3(v_st, 0.0);
    
    // Convert tangent space material normal to eye space
    materialInput.normalEC = normalEC;
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);
    
    // Convert view vector to world space
    vec3 positionToEyeEC = -v_positionEC; 
    materialInput.positionToEyeEC = positionToEyeEC;

    czm_material material = czm_getMaterial(materialInput);
    
#ifdef FLAT    
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#else
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
#endif
}
