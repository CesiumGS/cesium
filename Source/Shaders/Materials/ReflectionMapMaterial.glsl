uniform samplerCube u_cubeMap;
uniform sampler2D u_diffuseTexture;
uniform sampler2D u_reflectionMap;
uniform float u_reflectivity;

//x,y,z : normal in eye space
vec3 agi_getMaterialNormal(float zDistance, vec2 st, vec3 str, vec3 positionMC, vec3 normalEC)
{
    vec3 normalTangentSpace = vec3(0.0, 0.0, 1.0);
    normalEC = normalize(agi_eastNorthUpToEyeCoordinates(positionMC, normalEC) * normalTangentSpace);
    return normalEC;
}

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(float zDistance, vec2 st, vec3 str, vec3 positionMC, vec3 viewWC)
{
    //Reflection
    vec3 normalGlobeSurfaceEC = normalize(agi_normal * agi_geodeticSurfaceNormal(positionMC, vec3(0.0), vec3(1.0)));  
    vec3 normalEC = agi_getMaterialNormal(zDistance, st, str, positionMC, normalGlobeSurfaceEC);
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 reflectedWC = reflect(viewWC, normalWC);
    vec3 reflectedValue = textureCube(u_cubeMap, reflectedWC).rgb;
    
    //Diffuse
    vec4 diffuseComponent = texture2D(u_diffuseTexture, st);
    vec3 diffuseValue = diffuseComponent.xyz;
    float alpha = diffuseComponent.w;
    
    //Mix diffuse and reflective with reflectivity and reflection map.
    float totalReflectivity = u_reflectivity * texture2D(u_reflectionMap, st).x;
    vec3 finalColor = mix(diffuseValue, reflectedValue, totalReflectivity);
    
    return vec4(finalColor, alpha);
}

//x,y,z : specular color
//    w : specular intensity
vec4 agi_getMaterialSpecularComponent(float zDistance, vec2 st, vec3 str)
{
    return vec4(1.0, 1.0, 1.0, 0.001);
}