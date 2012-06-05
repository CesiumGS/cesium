uniform samplerCube u_cubeMap;
uniform float u_indexOfRefractionRatio;
uniform float u_diffuseAmount;

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    //Normal
    vec3 normalEC = agi_getMaterialNormalComponent(helperInput);
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    
    //Refraction
    vec3 refractedWC = refract(helperInput.positionToEyeWC, -normalWC, u_indexOfRefractionRatio);
    vec3 refractedValue = textureCube(u_cubeMap, refractedWC).rgb;

    //Reflection
    vec3 reflectedWC = reflect(helperInput.positionToEyeWC, normalWC);
    vec3 reflectedValue = textureCube(u_cubeMap, reflectedWC).rgb;
    
    //Mixing between reflection, refraction, and diffuse
    float cosAngIncidence = max(dot(normalWC, helperInput.positionToEyeWC), 0.0);
    
    
    vec3 finalColor = mix(reflectedValue, refractedValue, cosAngIncidence);
    finalColor *= (1.0 - u_diffuseAmount);
    
    return vec4(finalColor, 1.0);
}