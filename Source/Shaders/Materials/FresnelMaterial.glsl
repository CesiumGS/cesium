uniform samplerCube u_cubeMap;
uniform float u_indexOfRefractionRatio;
uniform float u_diffuseAmount;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    //Normal
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    
    //Refraction
    vec3 refractedWC = refract(materialInput.positionToEyeWC, -normalWC, u_indexOfRefractionRatio);
    vec3 refractedValue = textureCube(u_cubeMap, refractedWC).fresnel_material_channels;

    //Reflection
    vec3 reflectedWC = reflect(materialInput.positionToEyeWC, normalWC);
    vec3 reflectedValue = textureCube(u_cubeMap, reflectedWC).fresnel_material_channels;
    
    //Mixing between reflection, refraction, and diffuse
    float cosAngIncidence = max(dot(normalWC, materialInput.positionToEyeWC), 0.0);
    
    vec3 finalColor = mix(reflectedValue, refractedValue, cosAngIncidence);
    finalColor *= (1.0 - u_diffuseAmount);
    
    material.diffuse = finalColor;
    
    return material;
}