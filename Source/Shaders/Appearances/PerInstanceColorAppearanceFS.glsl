varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec4 v_color;

void main()
{
    vec3 positionToEyeEC = -v_positionEC;
    
	vec3 normalEC;
#ifdef FACE_FORWARD
    normalEC = normalize(faceforward(v_normalEC, vec3(0.0, 0.0, 1.0), -v_normalEC));
#else
    normalEC = normalize(v_normalEC);
#endif
    
    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.positionToEyeEC = positionToEyeEC;
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = v_color.rgb;
    material.alpha = v_color.a;
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
