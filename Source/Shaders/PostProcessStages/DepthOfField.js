//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
uniform sampler2D blurTexture;\n\
uniform sampler2D depthTexture;\n\
uniform float focalDistance;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
vec4 toEye(vec2 uv, float depth)\n\
{\n\
   vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n\
   vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);\n\
   posInCamera = posInCamera / posInCamera.w;\n\
   return posInCamera;\n\
}\n\
\n\
float computeDepthBlur(float depth)\n\
{\n\
    float f;\n\
    if (depth < focalDistance)\n\
    {\n\
        f = (focalDistance - depth) / (focalDistance - czm_currentFrustum.x);\n\
    }\n\
    else\n\
    {\n\
        f = (depth - focalDistance) / (czm_currentFrustum.y - focalDistance);\n\
        f = pow(f, 0.1);\n\
    }\n\
    f *= f;\n\
    f = clamp(f, 0.0, 1.0);\n\
    return pow(f, 0.5);\n\
}\n\
\n\
void main(void)\n\
{\n\
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n\
    vec4 posInCamera = toEye(v_textureCoordinates, depth);\n\
    float d = computeDepthBlur(-posInCamera.z);\n\
    gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), texture2D(blurTexture, v_textureCoordinates), d);\n\
}\n\
";
});