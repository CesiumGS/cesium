uniform sampler2D texture;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec4 textureValue = texture2D(texture, fract(repeat * materialInput.st));
    vec3 normalTangentSpace = textureValue.normalMapChannels;
    normalTangentSpace.xy = normalTangentSpace.xy * 2.0 - 1.0;
    normalTangentSpace.z = 0.2;
    normalTangentSpace = normalize(normalTangentSpace);
    
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;
    
    material.normal = normalEC;
    
    return material;
}