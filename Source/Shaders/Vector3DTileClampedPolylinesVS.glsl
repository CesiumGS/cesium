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

    scratchNormal = endPositionAndHeight.xyz - startPositionAndHeight.xyz;
    vec3 rightEC = czm_normal * normalize(cross(scratchNormal, startEllipsoidNormal));
    scratchNormal = czm_normal * scratchNormal; // scratchNormal = forwardEC

    vec4 positionEC = u_modifiedModelView * vec4(startPositionAndHeight.xyz, 1.0);
    positionEC.xyz += scratchNormal * isEnd; // scratchNormal = forwardEC // TODO: ^ above can prolly be less math

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
    scratchNormal = mix(-startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd);
    scratchNormal = cross(scratchNormal, mix(startEllipsoidNormal, endEllipsoidNormal, isEnd));
    scratchNormal = czm_normal * normalize(scratchNormal);

    float widthEC = 2.0 * endFaceNormalAndHalfWidth.w * max(0.0, czm_metersPerPixel(positionEC));
    widthEC = widthEC / dot(scratchNormal, rightEC);
    positionEC.xyz += scratchNormal * (widthEC * sign(0.5 - mod(startFaceNormalAndVertexCorner.w, 2.0)));

    // debug
    //positionEC.xyz += (czm_normal * mix(startFaceNormalAndVertexCorner.xyz, endFaceNormalAndHalfWidth.xyz, isEnd)) * 0.2;

    gl_Position = czm_depthClampFarPlane(czm_projection * positionEC);

    // Use middle-height of start and end points for planes
    targetHeight = 0.5 * (u_minimumMaximumHeight.x + u_minimumMaximumHeight.y);
    positionEC = vec4(startPositionAndHeight.xyz, 1.0);
    positionEC.xyz += (targetHeight - startPositionAndHeight.w) * startEllipsoidNormal;
    positionEC = u_modifiedModelView * positionEC;

    scratchNormal = czm_normal * startFaceNormalAndVertexCorner.xyz;
    v_startPlaneEC = vec4(scratchNormal, -dot(scratchNormal, positionEC.xyz));
    v_rightPlaneEC = vec4(rightEC, -dot(rightEC, positionEC.xyz));

    positionEC = vec4(endPositionAndHeight.xyz, 1.0);
    positionEC.xyz += (targetHeight - endPositionAndHeight.w) * endEllipsoidNormal;
    positionEC = u_modifiedModelView * positionEC;

    scratchNormal = czm_normal * endFaceNormalAndHalfWidth.xyz;
    v_endPlaneEC = vec4(scratchNormal, -dot(scratchNormal, positionEC.xyz));
    v_halfWidth = endFaceNormalAndHalfWidth.w;
}
