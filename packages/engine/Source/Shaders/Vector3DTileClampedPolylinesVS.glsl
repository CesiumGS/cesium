in vec3 startEllipsoidNormal;
in vec3 endEllipsoidNormal;
in vec4 startPositionAndHeight;
in vec4 endPositionAndHeight;
in vec4 startFaceNormalAndVertexCorner;
in vec4 endFaceNormalAndHalfWidth;
in float a_batchId;

uniform mat4 u_modifiedModelView;
uniform vec2 u_minimumMaximumVectorHeights;

out vec4 v_startPlaneEC;
out vec4 v_endPlaneEC;
out vec4 v_rightPlaneEC;
out float v_halfWidth;
out vec3 v_volumeUpEC;

void main()
{
    // vertex corner IDs
    //          3-----------7
    //         /|   left   /|
    //        / | 1       / |
    //       2-----------6  5  end
    //       | /         | /
    // start |/  right   |/
    //       0-----------4
    //
    float isEnd = floor(startFaceNormalAndVertexCorner.w * 0.251); // 0 for front, 1 for end
    float isTop = floor(startFaceNormalAndVertexCorner.w * mix(0.51, 0.19, isEnd)); // 0 for bottom, 1 for top

    vec3 forward = endPositionAndHeight.xyz - startPositionAndHeight.xyz;
    vec3 right = normalize(cross(forward, startEllipsoidNormal));

    vec4 position = vec4(startPositionAndHeight.xyz, 1.0);
    position.xyz += forward * isEnd;

    v_volumeUpEC = czm_normal * normalize(cross(right, forward));

    // Push for volume height
    float offset;
    vec3 ellipsoidNormal = mix(startEllipsoidNormal, endEllipsoidNormal, isEnd);

    // offset height to create volume
    offset = mix(startPositionAndHeight.w, endPositionAndHeight.w, isEnd);
    offset = mix(u_minimumMaximumVectorHeights.y, u_minimumMaximumVectorHeights.x, isTop) - offset;
    position.xyz += offset * ellipsoidNormal;

    // move from RTC to EC
    position = u_modifiedModelView * position;
    right = czm_normal * right;

    // Push for width in a direction that is in the start or end plane and in a plane with right
    // N = normalEC ("right-facing" direction for push)
    // R = right
    // p = angle between N and R
    // w = distance to push along R if R == N
    // d = distance to push along N
    //
    //   N   R
    //  { \ p| }      * cos(p) = dot(N, R) = w / d
    //  d\ \ |  |w    * d = w / dot(N, R)
    //    { \| }
    //       o---------- polyline segment ---->
    //
    vec3 scratchNormal = mix(-startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd);
    scratchNormal = cross(scratchNormal, mix(startEllipsoidNormal, endEllipsoidNormal, isEnd));
    vec3 miterPushNormal = czm_normal * normalize(scratchNormal);

    offset = 2.0 * endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(position)); // offset = widthEC
    offset = offset / dot(miterPushNormal, right);
    position.xyz += miterPushNormal * (offset * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));

    gl_Position = czm_depthClamp(czm_projection * position);

    position = u_modifiedModelView * vec4(startPositionAndHeight.xyz, 1.0);
    vec3 startNormalEC = czm_normal * startFaceNormalAndVertexCorner.xyz;
    v_startPlaneEC = vec4(startNormalEC, -dot(startNormalEC, position.xyz));
    v_rightPlaneEC = vec4(right, -dot(right, position.xyz));

    position = u_modifiedModelView * vec4(endPositionAndHeight.xyz, 1.0);
    vec3 endNormalEC = czm_normal * endFaceNormalAndHalfWidth.xyz;
    v_endPlaneEC = vec4(endNormalEC, -dot(endNormalEC, position.xyz));
    v_halfWidth = endFaceNormalAndHalfWidth.w;
}
