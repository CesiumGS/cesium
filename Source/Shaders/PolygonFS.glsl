uniform float u_erosion;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

#ifndef RENDER_FOR_PICK

void erode(vec3 str)
{
    if (u_erosion != 1.0)
    {
        float t = 0.5 + (0.5 * agi_snoise(str / (1.0 / 10.0)));   // Scale [-1, 1] to [0, 1]
    
        if (t > u_erosion)
        {
            discard;
        }
    }
}

#endif

void main()
{
    //View vector
    vec3 positionToEyeEC = normalize(-v_positionEC); 

    //Texture coordinates
    // TODO: Real 1D distance, and better 3D coordinate
    float zDistance = 0.0;          // 1D distance
    vec2 st = v_textureCoordinates; // 2D texture coordinates
    vec3 str = vec3(st, 0.0);       // 3D texture coordinates
    
    vec4 diffuseComponent = agi_getMaterialDiffuseComponent(zDistance, st, str, positionToEyeEC);
    vec4 specularComponent = agi_getMaterialSpecularComponent(zDistance, st, str, positionToEyeEC);

    //Convert tangent space material normal to eye space
    vec3 normalTangentSpace = agi_getMaterialNormal(zDistance, st, str, positionToEyeEC);
    vec3 normalEC = normalize(agi_normal * agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));  
    normalEC = normalize(agi_eastNorthUpToEyeCoordinates(v_positionMC, normalEC) * normalTangentSpace);

    //Final
    gl_FragColor = agi_lightValueGaussian(agi_sunDirectionEC, positionToEyeEC, normalEC, diffuseComponent, specularComponent);
}
