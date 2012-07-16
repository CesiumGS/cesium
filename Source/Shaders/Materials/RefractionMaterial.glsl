uniform samplerCube u_cubeMap;
uniform float u_indexOfRefractionRatio;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    vec3 refractedWC = refract(materialInput.positionToEyeWC, -normalWC, u_indexOfRefractionRatio);
    vec3 refractedValue = textureCube(u_cubeMap, refractedWC).refractionChannels;

    material.diffuse = refractedValue;
    
    return material;
}