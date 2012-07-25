agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 normalEC = material.normal;
    vec3 normalWC = normalize(vec3(agi_inverseView * vec4(normalEC, 0.0)));
    float cosAngIncidence = max(dot(normalWC, materialInput.positionToEyeWC), 0.0);
    
    material.diffuse = mix(reflection.diffuse, refraction.diffuse, cosAngIncidence);
    
    return material;
}
