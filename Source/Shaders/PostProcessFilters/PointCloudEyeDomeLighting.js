//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#extension GL_EXT_frag_depth : enable\n\
\n\
uniform sampler2D u_pointCloud_colorTexture;\n\
uniform sampler2D u_pointCloud_ecAndLogDepthTexture;\n\
uniform vec3 u_distancesAndEdlStrength;\n\
varying vec2 v_textureCoordinates;\n\
\n\
vec2 neighborContribution(float log2Depth, vec2 padding)\n\
{\n\
    vec2 depthAndLog2Depth = texture2D(u_pointCloud_ecAndLogDepthTexture, v_textureCoordinates + padding).zw;\n\
    if (depthAndLog2Depth.x == 0.0) // 0.0 is the clear value for the gbuffer\n\
    {\n\
        return vec2(0.0); // throw out this sample\n\
    }\n\
    else\n\
    {\n\
        return vec2(max(0.0, log2Depth - depthAndLog2Depth.y), 1.0);\n\
    }\n\
}\n\
\n\
void main()\n\
{\n\
    vec4 ecAlphaDepth = texture2D(u_pointCloud_ecAndLogDepthTexture, v_textureCoordinates);\n\
    if (length(ecAlphaDepth.xyz) < czm_epsilon7)\n\
    {\n\
        discard;\n\
    }\n\
\n\
    vec4 color = texture2D(u_pointCloud_colorTexture, v_textureCoordinates);\n\
\n\
    // sample from neighbors up, down, left, right\n\
    float distX = u_distancesAndEdlStrength.x;\n\
    float distY = u_distancesAndEdlStrength.y;\n\
\n\
    vec2 responseAndCount = vec2(0.0);\n\
\n\
    responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(0, distY));\n\
    responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(distX, 0));\n\
    responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(0, -distY));\n\
    responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(-distX, 0));\n\
\n\
    float response = responseAndCount.x / responseAndCount.y;\n\
    float shade = exp(-response * 300.0 * u_distancesAndEdlStrength.z);\n\
    color.rgb *= shade;\n\
    gl_FragColor = vec4(color);\n\
\n\
#ifdef LOG_DEPTH\n\
    czm_writeLogDepth(1.0 + (czm_projection * vec4(ecAlphaDepth.xyz, 1.0)).w);\n\
#else\n\
    gl_FragDepthEXT = czm_eyeToWindowCoordinates(vec4(ecAlphaDepth.xyz, 1.0)).z;\n\
#endif\n\
}\n\
";
});