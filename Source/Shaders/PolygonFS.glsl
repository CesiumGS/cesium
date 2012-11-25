uniform float u_erosion;
uniform float u_morphTime;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

#ifndef RENDER_FOR_PICK

void erode(vec3 str)
{
    if (u_erosion != 1.0)
    {
        float t = 0.5 + (0.5 * czm_snoise(str / (1.0 / 10.0)));   // Scale [-1, 1] to [0, 1]
    
        if (t > u_erosion)
        {
            discard;
        }
    }
}

#endif

void main()
{
    czm_materialInput materialInput;
    
    // TODO: Real 1D distance, and better 3D coordinate
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    materialInput.positionMC = v_positionMC;
    
    //Convert tangent space material normal to eye space
    materialInput.normalEC = mix(czm_normal[0], normalize(czm_normal * czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0))), u_morphTime); // +x is up in Columbus view   
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);
    
    //Convert view vector to world space
    vec3 positionToEyeEC = -v_positionEC; 
    materialInput.positionToEyeEC = positionToEyeEC;

    erode(materialInput.str);
    czm_material material = czm_getMaterial(materialInput);
    
    gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
