attribute vec3 startEllipsoidNormal;
attribute vec3 endEllipsoidNormal;
attribute vec4 startPositionAndHeight;
attribute vec4 endPositionAndHeight;
attribute vec4 startFaceNormalAndVertexCorner;
attribute vec4 endFaceNormalAndHalfWidth;
attribute float a_batchId;

uniform mat4 u_modifiedModelView;
uniform vec2 u_minimumMaximumHeight;

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

    scratchNormal = endPositionAndHeight.xyz - startPositionAndHeight.xyz;
    vec3 rightEC = czm_normal * normalize(cross(scratchNormal, startEllipsoidNormal));
    scratchNormal = czm_normal * scratchNormal; // scratchNormal = forwardEC

    vec4 positionEC = u_modifiedModelView * vec4(startPositionAndHeight.xyz, 1.0);
    positionEC.xyz += scratchNormal * isEnd; // scratchNormal = forwardEC

    // Push for volume height
    float targetHeight = mix(u_minimumMaximumHeight.x, u_minimumMaximumHeight.y, isTop);
    scratchNormal = czm_normal * mix(startEllipsoidNormal, endEllipsoidNormal, isEnd); // scratchNormal = ellipsoidNormalEC
    float ellipsoidHeight = mix(startPositionAndHeight.w, endPositionAndHeight.w, isEnd);
    positionEC.xyz += (targetHeight - ellipsoidHeight) * scratchNormal; // scratchNormal = ellipsoidNormalEC

    // Push for width in a direction that is in the start or end plane and in a plane with rightEC
    // N = normalEC ("right-facing" direction for push)
    // R = rightEC
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
    //scratchNormal = mix(-startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd);
    //scratchNormal = cross(scratchNormal, mix(startEllipsoidNormal, endEllipsoidNormal, isEnd));
    //scratchNormal = czm_normal * normalize(scratchNormal);

    //float widthEC = endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(positionEC));
    //widthEC = widthEC / dot(scratchNormal, rightEC);
    //positionEC.xyz += scratchNormal * (widthEC * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));

    // Push for width. Don't worry about mitering for now.
    float widthEC = endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(positionEC));
    positionEC.xyz += rightEC * (widthEC * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));

    gl_Position = czm_projection * positionEC;
}
