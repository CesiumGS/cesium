//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#extension GL_EXT_frag_depth : enable\n\
\n\
uniform sampler2D u_pointCloud_colorGBuffer;\n\
uniform sampler2D u_pointCloud_depthGBuffer;\n\
uniform vec3 u_distancesAndEdlStrength;\n\
varying vec2 v_textureCoordinates;\n\
\n\
vec2 neighborContribution(float log2Depth, vec2 padding)\n\
{\n\
    float depthOrLogDepth = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, v_textureCoordinates + padding));\n\
    if (depthOrLogDepth == 0.0) { // 0.0 is the clear value for the gbuffer\n\
        return vec2(0.0);\n\
    }\n\
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(v_textureCoordinates + padding, depthOrLogDepth);\n\
    return vec2(max(0.0, log2Depth - log2(-eyeCoordinate.z / eyeCoordinate.w)), 1.0);\n\
}\n\
\n\
void main()\n\
{\n\
    float depthOrLogDepth = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, v_textureCoordinates));\n\
\n\
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depthOrLogDepth);\n\
    eyeCoordinate /= eyeCoordinate.w;\n\
\n\
    float log2Depth = log2(-eyeCoordinate.z);\n\
\n\
    if (depthOrLogDepth == 0.0) // 0.0 is the clear value for the gbuffer\n\
    {\n\
        discard;\n\
    }\n\
\n\
    vec4 color = texture2D(u_pointCloud_colorGBuffer, v_textureCoordinates);\n\
\n\
    // sample from neighbors up, down, left, right\n\
    float distX = u_distancesAndEdlStrength.x;\n\
    float distY = u_distancesAndEdlStrength.y;\n\
\n\
    vec2 responseAndCount = vec2(0.0);\n\
\n\
    responseAndCount += neighborContribution(log2Depth, vec2(0, distY));\n\
    responseAndCount += neighborContribution(log2Depth, vec2(distX, 0));\n\
    responseAndCount += neighborContribution(log2Depth, vec2(0, -distY));\n\
    responseAndCount += neighborContribution(log2Depth, vec2(-distX, 0));\n\
\n\
    float response = responseAndCount.x / responseAndCount.y;\n\
    float shade = exp(-response * 300.0 * u_distancesAndEdlStrength.z);\n\
    color.rgb *= shade;\n\
    gl_FragColor = vec4(color);\n\
\n\
#ifdef LOG_DEPTH\n\
    czm_writeLogDepth(1.0 + (czm_projection * vec4(eyeCoordinate.xyz, 1.0)).w);\n\
#else\n\
    gl_FragDepthEXT = czm_eyeToWindowCoordinates(vec4(eyeCoordinate.xyz, 1.0)).z;\n\
#endif\n\
}\n\
";
});