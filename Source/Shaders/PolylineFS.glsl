varying vec2 v_textureCoordinates;
varying vec3 v_positionEC;

void main()
{
    czm_materialInput materialInput;
    
    materialInput.s = v_textureCoordinates.r;
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    
    materialInput.normalEC = vec3(0.0, 0.0, 1.0);
    
    vec3 positionToEyeEC = -v_positionEC; 
    materialInput.positionToEyeEC = positionToEyeEC;
    
    czm_material material = czm_getMaterial(materialInput);
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}