attribute vec3 startEllipsoidNormal;
attribute vec3 endEllipsoidNormal;
attribute vec4 startPositionAndHeight;
attribute vec4 endPositionAndHeight;
attribute vec4 startFaceNormalAndVertexCorner;
attribute vec4 endFaceNormalAndHalfWidth;
attribute float a_batchId;

uniform mat4 u_modifiedModelView;
uniform vec2 u_minimumMaximumHeight;

varying vec4 v_startPlaneEC;
varying vec4 v_endPlaneEC;
varying vec4 v_rightPlaneEC;
varying float v_halfWidth;

void main()
{
    vec3 scratchNormal;
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

    scratchNormal = endPositionAndHeight.xyz - startPositionAndHeight.xyz; // scratchNormal = forward
    vec3 right = normalize(cross(scratchNormal, startEllipsoidNormal));

    vec4 position = vec4(startPositionAndHeight.xyz, 1.0);
    position.xyz += scratchNormal * isEnd; // scratchNormal = forward

    // Push for volume height
    float targetHeight = mix(u_minimumMaximumHeight.x, u_minimumMaximumHeight.y, isTop);
    scratchNormal = mix(startEllipsoidNormal, endEllipsoidNormal, isEnd); // scratchNormal = ellipsoidNormal
    float ellipsoidHeight = mix(startPositionAndHeight.w, endPositionAndHeight.w, isEnd);
    position.xyz += (targetHeight - ellipsoidHeight) * scratchNormal; // scratchNormal = ellipsoidNormal

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
    scratchNormal = mix(-startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd);
    scratchNormal = cross(scratchNormal, mix(startEllipsoidNormal, endEllipsoidNormal, isEnd));
    scratchNormal = czm_normal * normalize(scratchNormal);

    float widthEC = 2.0 * endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(position));
    widthEC = widthEC / dot(scratchNormal, right);
    position.xyz += scratchNormal * (widthEC * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));

    // debug
    //position.xyz += (czm_normal * mix(startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd)) * 0.2;

    gl_Position = czm_depthClampFarPlane(czm_projection * position);

    position = u_modifiedModelView * vec4(startPositionAndHeight.xyz, 1.0);
    scratchNormal = czm_normal * startFaceNormalAndVertexCorner.xyz;
    v_startPlaneEC = vec4(scratchNormal, -dot(scratchNormal, position.xyz));
    v_rightPlaneEC = vec4(right, -dot(right, position.xyz));

    position = u_modifiedModelView * vec4(endPositionAndHeight.xyz, 1.0);
    scratchNormal = czm_normal * endFaceNormalAndHalfWidth.xyz;
    v_endPlaneEC = vec4(scratchNormal, -dot(scratchNormal, position.xyz));
    v_halfWidth = endFaceNormalAndHalfWidth.w;
}
