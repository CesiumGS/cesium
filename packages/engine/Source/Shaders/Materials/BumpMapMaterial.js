//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D image;\n\
uniform float strength;\n\
uniform vec2 repeat;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
\n\
    vec2 centerPixel = fract(repeat * st);\n\
    float centerBump = texture2D(image, centerPixel).channel;\n\
\n\
    float imageWidth = float(imageDimensions.x);\n\
    vec2 rightPixel = fract(repeat * (st + vec2(1.0 / imageWidth, 0.0)));\n\
    float rightBump = texture2D(image, rightPixel).channel;\n\
\n\
    float imageHeight = float(imageDimensions.y);\n\
    vec2 leftPixel = fract(repeat * (st + vec2(0.0, 1.0 / imageHeight)));\n\
    float topBump = texture2D(image, leftPixel).channel;\n\
\n\
    vec3 normalTangentSpace = normalize(vec3(centerBump - rightBump, centerBump - topBump, clamp(1.0 - strength, 0.1, 1.0)));\n\
    vec3 normalEC = materialInput.tangentToEyeMatrix * normalTangentSpace;\n\
\n\
    material.normal = normalEC;\n\
    material.diffuse = vec3(0.01);\n\
\n\
    return material;\n\
}\n\
";
