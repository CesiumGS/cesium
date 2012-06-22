uniform sampler2D u_texture;
uniform vec2 u_repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    
    vec3 normalTangentSpace = texture2D(u_texture, fract(u_repeat * materialInput.st)).xyz;
    normalTangentSpace.xy = normalTangentSpace.xy * 2.0 - 1.0;
    normalTangentSpace = normalize(normalTangentSpace);
    
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;
    
    // TODO: Will remove the diffuse and specular later.
    material.diffuse = vec3(0.2, 0.2, 0.2);
    material.specular = 0.1;
    material.normal = normalEC;
    
    return material;
}