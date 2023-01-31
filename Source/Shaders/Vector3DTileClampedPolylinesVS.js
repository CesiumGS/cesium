//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec3 startEllipsoidNormal;\n\
attribute vec3 endEllipsoidNormal;\n\
attribute vec4 startPositionAndHeight;\n\
attribute vec4 endPositionAndHeight;\n\
attribute vec4 startFaceNormalAndVertexCorner;\n\
attribute vec4 endFaceNormalAndHalfWidth;\n\
attribute float a_batchId;\n\
\n\
uniform mat4 u_modifiedModelView;\n\
uniform vec2 u_minimumMaximumVectorHeights;\n\
\n\
varying vec4 v_startPlaneEC;\n\
varying vec4 v_endPlaneEC;\n\
varying vec4 v_rightPlaneEC;\n\
varying float v_halfWidth;\n\
varying vec3 v_volumeUpEC;\n\
\n\
void main()\n\
{\n\
    // vertex corner IDs\n\
    //          3-----------7\n\
    //         /|   left   /|\n\
    //        / | 1       / |\n\
    //       2-----------6  5  end\n\
    //       | /         | /\n\
    // start |/  right   |/\n\
    //       0-----------4\n\
    //\n\
    float isEnd = floor(startFaceNormalAndVertexCorner.w * 0.251); // 0 for front, 1 for end\n\
    float isTop = floor(startFaceNormalAndVertexCorner.w * mix(0.51, 0.19, isEnd)); // 0 for bottom, 1 for top\n\
\n\
    vec3 forward = endPositionAndHeight.xyz - startPositionAndHeight.xyz;\n\
    vec3 right = normalize(cross(forward, startEllipsoidNormal));\n\
\n\
    vec4 position = vec4(startPositionAndHeight.xyz, 1.0);\n\
    position.xyz += forward * isEnd;\n\
\n\
    v_volumeUpEC = czm_normal * normalize(cross(right, forward));\n\
\n\
    // Push for volume height\n\
    float offset;\n\
    vec3 ellipsoidNormal = mix(startEllipsoidNormal, endEllipsoidNormal, isEnd);\n\
\n\
    // offset height to create volume\n\
    offset = mix(startPositionAndHeight.w, endPositionAndHeight.w, isEnd);\n\
    offset = mix(u_minimumMaximumVectorHeights.y, u_minimumMaximumVectorHeights.x, isTop) - offset;\n\
    position.xyz += offset * ellipsoidNormal;\n\
\n\
    // move from RTC to EC\n\
    position = u_modifiedModelView * position;\n\
    right = czm_normal * right;\n\
\n\
    // Push for width in a direction that is in the start or end plane and in a plane with right\n\
    // N = normalEC (\"right-facing\" direction for push)\n\
    // R = right\n\
    // p = angle between N and R\n\
    // w = distance to push along R if R == N\n\
    // d = distance to push along N\n\
    //\n\
    //   N   R\n\
    //  { \ p| }      * cos(p) = dot(N, R) = w / d\n\
    //  d\ \ |  |w    * d = w / dot(N, R)\n\
    //    { \| }\n\
    //       o---------- polyline segment ---->\n\
    //\n\
    vec3 scratchNormal = mix(-startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd);\n\
    scratchNormal = cross(scratchNormal, mix(startEllipsoidNormal, endEllipsoidNormal, isEnd));\n\
    vec3 miterPushNormal = czm_normal * normalize(scratchNormal);\n\
\n\
    offset = 2.0 * endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(position)); // offset = widthEC\n\
    offset = offset / dot(miterPushNormal, right);\n\
    position.xyz += miterPushNormal * (offset * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));\n\
\n\
    gl_Position = czm_depthClamp(czm_projection * position);\n\
\n\
    position = u_modifiedModelView * vec4(startPositionAndHeight.xyz, 1.0);\n\
    vec3 startNormalEC = czm_normal * startFaceNormalAndVertexCorner.xyz;\n\
    v_startPlaneEC = vec4(startNormalEC, -dot(startNormalEC, position.xyz));\n\
    v_rightPlaneEC = vec4(right, -dot(right, position.xyz));\n\
\n\
    position = u_modifiedModelView * vec4(endPositionAndHeight.xyz, 1.0);\n\
    vec3 endNormalEC = czm_normal * endFaceNormalAndHalfWidth.xyz;\n\
    v_endPlaneEC = vec4(endNormalEC, -dot(endNormalEC, position.xyz));\n\
    v_halfWidth = endFaceNormalAndHalfWidth.w;\n\
}\n\
";
