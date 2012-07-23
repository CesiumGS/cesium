uniform sampler2D texture;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);
    material.specular = texture2D(texture, fract(repeat * materialInput.st)).channel;
    return material;
}