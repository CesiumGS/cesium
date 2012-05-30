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
    //Texture coordinates----------------------------
    // TODO: Real 1D distance, and better 3D coordinate
    float zDistance = 0.0;          // 1D distance
    vec2 st = v_textureCoordinates; // 2D texture coordinates
    vec3 str = vec3(st, 0.0);       // 3D texture coordinates
    
    //View vector
    vec3 positionToEyeEC = normalize(-v_positionEC); 
    
    //Diffuse component
    vec4 diffuseComponent = agi_getMaterialDiffuseComponent(zDistance, st, str, positionToEyeEC);
    vec3 diffuseColor = diffuseComponent.xyz;
    float alpha = diffuseComponent.w;
    
    //Specular component
    vec4 specularComponent = agi_getMaterialSpecularComponent(zDistance, st, str, positionToEyeEC);
    vec3 specularColor = specularComponent.xyz;
    float specularIntensity = specularComponent.w;
    
    //Normal
    vec3 normalTangentSpace = agi_getMaterialNormal(zDistance, st, str, positionToEyeEC);
    //Get normal from globe surface
    vec3 normalEC = normalize(agi_normal * agi_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));  
    //Perturb normal based on material tangent space normal
    normalEC = normalize(agi_eastNorthUpToEyeCoordinates(v_positionMC, normalEC) * normalTangentSpace);
    
    float intensity = agi_lightIntensity(normalEC, agi_sunDirectionEC, positionToEyeEC);
    gl_FragColor = vec4(intensity * diffuseColor, alpha);
}
