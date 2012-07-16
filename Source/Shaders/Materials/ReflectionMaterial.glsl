uniform samplerCube u_cubeMap;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 reflectedWC = reflect(materialInput.positionToEyeWC, normalWC);
    vec3 reflectedValue = textureCube(u_cubeMap, reflectedWC).reflectionChannels;
    
    material.diffuse = reflectedValue;
    
    return material;
}