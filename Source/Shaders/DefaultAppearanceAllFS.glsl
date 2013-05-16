varying vec3 v_normalEC;
varying vec3 v_tangentEC;
varying vec3 v_binormalEC;
varying vec3 v_positionEC;
varying vec2 v_st;

void main()
{
    vec3 positionToEyeEC = -v_positionEC; 
    
    vec3 normalEC = normalize(v_normalEC);
    vec3 tangentEC = normalize(v_tangentEC);
    vec3 binormalEC = normalize(v_binormalEC);
    mat3 tangentToEyeMatrix = mat3(
        tangentEC.x,   tangentEC.y,   tangentEC.z,
        binormalEC.x,  binormalEC.y,  binormalEC.z,
        normalEC.x,    normalEC.y,    normalEC.z);

    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.tangentToEyeMatrix = tangentToEyeMatrix;
    materialInput.positionToEyeEC = positionToEyeEC;
    materialInput.st = v_st;
    czm_material material = czm_getMaterial(materialInput);
    
    //material.specular = 0.2;
    //material.shininess = 10.0;
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
