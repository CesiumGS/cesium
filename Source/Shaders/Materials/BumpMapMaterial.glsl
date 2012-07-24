uniform sampler2D texture;
uniform ivec2 textureDimensions;
uniform float strength;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    
    vec2 centerPixel = fract(repeat * st);
    float centerBump = texture2D(texture, centerPixel).channel;
    
    float textureWidth = float(textureDimensions.x);
    vec2 rightPixel = fract(repeat * (st + vec2(1.0 / textureWidth, 0.0)));
    float rightBump = texture2D(texture, rightPixel).channel;
    
    float textureHeight = float(textureDimensions.y);
    vec2 leftPixel = fract(repeat * (st + vec2(0.0, 1.0 / textureHeight)));
    float topBump = texture2D(texture, leftPixel).channel;
    
    vec3 normalTangentSpace = normalize(vec3(centerBump - rightBump, centerBump - topBump, clamp(1.0 - strength, 0.1, 1.0)));
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;
 
    material.normal = normalEC;
    
    return material;
}