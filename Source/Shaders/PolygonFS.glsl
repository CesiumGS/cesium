uniform float u_morphTime;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

void main()
{
    czm_materialInput materialInput;
    
    // TODO: Real 1D distance, and better 3D coordinate
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    
    //Convert tangent space material normal to eye space
    materialInput.normalEC = normalize(czm_normal3D * czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);
    
    //Convert view vector to world space
    vec3 positionToEyeEC = -v_positionEC; 
    materialInput.positionToEyeEC = positionToEyeEC;

    czm_material material = czm_getMaterial(materialInput);
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
