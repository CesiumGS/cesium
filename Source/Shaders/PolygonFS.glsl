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
    MaterialHelperInput helperInput;
    
    //Texture coordinates
    // TODO: Real 1D distance, and better 3D coordinate
    helperInput.zDistance = 0.0;          // 1D distance
    helperInput.st = v_textureCoordinates; // 2D texture coordinates
    helperInput.str = vec3(helperInput.st, 0.0);       // 3D texture coordinates

    //Convert tangent space material normal to eye space
    helperInput.normalEC = normalize(agi_normal * agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));  
    helperInput.tangentToEyeMatrix = agi_eastNorthUpToEyeCoordinates(v_positionMC, helperInput.normalEC);
    
    //Convert view vector to world space
    vec3 positionToEyeEC = normalize(-v_positionEC); 
    helperInput.positionToEyeWC = normalize(vec3(agi_inverseView * vec4(positionToEyeEC, 0.0)));

    //Get different material values from material shader
    vec3 normalEC = agi_getMaterialNormalComponent(helperInput);
    vec4 diffuseComponent = agi_getMaterialDiffuseComponent(helperInput);
    vec4 specularComponent = agi_getMaterialSpecularComponent(helperInput);
    vec3 emissionComponent = agi_getMaterialEmissionComponent(helperInput);

    //Final
    gl_FragColor = agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, normalEC, diffuseComponent, specularComponent, emissionComponent);
}
