uniform sampler2D texture;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    vec4 textureValue = texture2D(texture, fract(repeat * materialInput.st));
    material.diffuse = textureValue.diffuseChannels;
    material.alpha = textureValue.alphaChannel;
    return material;
}