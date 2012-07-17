uniform sampler2D texture;
uniform vec2 repeat;

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    
    vec2 centerPixel = fract(repeat * st);
    float centerBump = texture2D(texture, centerPixel).bumpMapChannel;
    
    float windowWidth = float(agi_viewport.z);
    vec2 rightPixel = fract(repeat * (st + vec2(1.0 / windowWidth, 0.0)));
    float rightBump = texture2D(texture, rightPixel).bumpMapChannel;
    
    float windowHeight = float(agi_viewport.w);
    vec2 leftPixel = fract(repeat * (st + vec2(0.0, 1.0 / windowHeight)));
    float topBump = texture2D(texture, leftPixel).bumpMapChannel;
    
    vec3 normalTangentSpace = normalize(vec3(centerBump - rightBump, centerBump - topBump, 0.2));
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;
 
    material.normal = normalEC;
    
    return material;
}