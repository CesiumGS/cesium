varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec4 v_color;

void main()
{
    //vec3 positionToEyeEC = -v_positionEC; 
    //czm_material material = czm_getDefaultMaterial();
    //materialInput.normalEC = normalize(v_normalEC);
    //materialInput.positionToEyeEC = positionToEyeEC;
    //materia.diffuse = v_color.rgb;
    //material.alpha = v_color.a;
    //gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
    gl_FragColor = v_color;
}
