varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec4 v_color;

void main()
{
    vec3 positionToEyeEC = -v_positionEC;

    vec3 normalEC = normalize(v_normalEC);
#ifdef FACE_FORWARD
    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
#endif

    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.positionToEyeEC = positionToEyeEC;
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = v_color.rgb;
    material.emission = v_color.rgb * 0.15;
    material.alpha = v_color.a;
    material.specularColor = mix(material.diffuse, vec3(0.04), material.roughness);

    gl_FragColor = czm_phongWithIBL(v_positionEC, material);
}
