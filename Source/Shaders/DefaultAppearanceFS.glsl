varying vec3 v_normalEC;
varying vec3 v_positionEC;

void main()
{
    vec3 positionToEyeEC = -v_positionEC; 

    czm_materialInput materialInput;
    materialInput.normalEC = v_normalEC;
    materialInput.positionToEyeEC = positionToEyeEC;
    czm_material material = czm_getMaterial(materialInput);
    
//    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
}
