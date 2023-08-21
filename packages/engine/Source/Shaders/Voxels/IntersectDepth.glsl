// See IntersectionUtils.glsl for the definitions of Ray, Intersections,
// setIntersectionPair, INF_HIT, NO_HIT

/* intersectDepth defines (set in Scene/VoxelRenderResources.js)
#define DEPTH_INTERSECTION_INDEX ###
*/

uniform mat4 u_transformPositionViewToUv;

void intersectDepth(in vec2 screenCoord, in Ray ray, inout Intersections ix) {
    float logDepthOrDepth = czm_unpackDepth(texture(czm_globeDepthTexture, screenCoord));
    if (logDepthOrDepth != 0.0) {
        // Calculate how far the ray must travel before it hits the depth buffer.
        vec4 eyeCoordinateDepth = czm_screenToEyeCoordinates(screenCoord, logDepthOrDepth);
        eyeCoordinateDepth /= eyeCoordinateDepth.w;
        vec3 depthPositionUv = vec3(u_transformPositionViewToUv * eyeCoordinateDepth);
        float t = dot(depthPositionUv - ray.pos, ray.dir);
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(t, +INF_HIT));
    } else {
        // There's no depth at this location.
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(NO_HIT));
    }
}
