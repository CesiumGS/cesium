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
    agi_materialInput materialInput;
    
    // TODO: Real 1D distance, and better 3D coordinate
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    materialInput.positionMC = v_positionMC;
    
    //Convert tangent space material normal to eye space
    materialInput.normalEC = normalize(agi_normal * agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));  
    materialInput.tangentToEyeMatrix = agi_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);
    
    //Convert view vector to world space
    vec3 positionToEyeEC = normalize(-v_positionEC); 
    materialInput.positionToEyeWC = normalize(vec3(agi_inverseView * vec4(positionToEyeEC, 0.0)));

    erode(materialInput.str);
    agi_material material = agi_getMaterial(materialInput);
    
    vec4 color; 
    #ifdef AFFECTED_BY_LIGHTING
    color = agi_lightValuePhong(agi_sunDirectionEC, positionToEyeEC, material);
    #else
    color = vec4(material.diffuseComponent, material.alphaComponent);
    #endif
    
    gl_FragColor = color;
}
