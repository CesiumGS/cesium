uniform samplerCube u_cubeMap;
uniform float u_reflectivity;

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    //Refraction
    vec3 normalEC = agi_getMaterialNormalComponent(helperInput);
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 reflectedWC = reflect(helperInput.positionToEyeWC, normalWC);
    vec3 reflectedValue = textureCube(u_cubeMap, reflectedWC).rgb;
    reflectedValue *= u_reflectivity;
    
    return vec4(reflectedValue, 1.0);
}