//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * @private\n\
 */\n\
vec4 czm_getWaterNoise(sampler2D normalMap, vec2 uv, float time, float angleInRadians)\n\
{\n\
    float cosAngle = cos(angleInRadians);\n\
    float sinAngle = sin(angleInRadians);\n\
\n\
    // time dependent sampling directions\n\
    vec2 s0 = vec2(1.0/17.0, 0.0);\n\
    vec2 s1 = vec2(-1.0/29.0, 0.0);\n\
    vec2 s2 = vec2(1.0/101.0, 1.0/59.0);\n\
    vec2 s3 = vec2(-1.0/109.0, -1.0/57.0);\n\
\n\
    // rotate sampling direction by specified angle\n\
    s0 = vec2((cosAngle * s0.x) - (sinAngle * s0.y), (sinAngle * s0.x) + (cosAngle * s0.y));\n\
    s1 = vec2((cosAngle * s1.x) - (sinAngle * s1.y), (sinAngle * s1.x) + (cosAngle * s1.y));\n\
    s2 = vec2((cosAngle * s2.x) - (sinAngle * s2.y), (sinAngle * s2.x) + (cosAngle * s2.y));\n\
    s3 = vec2((cosAngle * s3.x) - (sinAngle * s3.y), (sinAngle * s3.x) + (cosAngle * s3.y));\n\
\n\
    vec2 uv0 = (uv/103.0) + (time * s0);\n\
    vec2 uv1 = uv/107.0 + (time * s1) + vec2(0.23);\n\
    vec2 uv2 = uv/vec2(897.0, 983.0) + (time * s2) + vec2(0.51);\n\
    vec2 uv3 = uv/vec2(991.0, 877.0) + (time * s3) + vec2(0.71);\n\
\n\
    uv0 = fract(uv0);\n\
    uv1 = fract(uv1);\n\
    uv2 = fract(uv2);\n\
    uv3 = fract(uv3);\n\
    vec4 noise = (texture2D(normalMap, uv0)) +\n\
                 (texture2D(normalMap, uv1)) +\n\
                 (texture2D(normalMap, uv2)) +\n\
                 (texture2D(normalMap, uv3));\n\
\n\
    // average and scale to between -1 and 1\n\
    return ((noise / 4.0) - 0.5) * 2.0;\n\
}\n\
";
