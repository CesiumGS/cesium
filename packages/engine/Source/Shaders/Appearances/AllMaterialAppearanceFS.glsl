in vec3 v_positionEC;
in vec3 v_normalEC;
in vec3 v_tangentEC;
in vec3 v_bitangentEC;
in vec2 v_st;

void main()
{
    vec3 positionToEyeEC = -v_positionEC;
    mat3 tangentToEyeMatrix = czm_tangentToEyeSpaceMatrix(v_normalEC, v_tangentEC, v_bitangentEC);

    vec3 normalEC = normalize(v_normalEC);
#ifdef FACE_FORWARD
    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
#endif

    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.tangentToEyeMatrix = tangentToEyeMatrix;
    materialInput.positionToEyeEC = positionToEyeEC;
    materialInput.st = v_st;
    czm_material material = czm_getMaterial(materialInput);

#ifdef FLAT
    out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#else
    out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
#endif
}
