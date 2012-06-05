uniform samplerCube u_cubeMap;
uniform float u_indexOfRefractionRatio;
uniform float u_refractivity;

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    vec3 normalEC = agi_getMaterialNormalComponent(helperInput);
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 refractedWC = refract(helperInput.positionToEyeWC, -normalWC, u_indexOfRefractionRatio);
    vec3 refractedValue = textureCube(u_cubeMap, refractedWC).rgb;
    refractedValue *= u_refractivity;

    return vec4(refractedValue, 1.0);
}