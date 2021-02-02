uniform sampler2D image;
uniform float strength;
uniform vec2 repeat;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;

    vec2 centerPixel = fract(repeat * st);
    float centerBump = texture2D(image, centerPixel).channel;

    float imageWidth = float(imageDimensions.x);
    vec2 rightPixel = fract(repeat * (st + vec2(1.0 / imageWidth, 0.0)));
    float rightBump = texture2D(image, rightPixel).channel;

    float imageHeight = float(imageDimensions.y);
    vec2 leftPixel = fract(repeat * (st + vec2(0.0, 1.0 / imageHeight)));
    float topBump = texture2D(image, leftPixel).channel;

    vec3 normalTangentSpace = normalize(vec3(centerBump - rightBump, centerBump - topBump, clamp(1.0 - strength, 0.1, 1.0)));
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;

    material.normal = normalEC;
    material.diffuse = vec3(0.01);

    return material;
}
