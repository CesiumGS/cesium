varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec4 v_color;

void main()
{
    vec3 positionToEyeEC = -v_positionEC;
    
    czm_materialInput materialInput;
    materialInput.normalEC = normalize(v_normalEC);
    materialInput.positionToEyeEC = positionToEyeEC;
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = v_color.rgb;
    material.alpha = v_color.a;
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
