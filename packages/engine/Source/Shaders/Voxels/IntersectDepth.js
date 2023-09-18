//This file is automatically rebuilt by the Cesium build process.
export default "// See IntersectionUtils.glsl for the definitions of Ray, Intersections,\n\
// setIntersectionPair, INF_HIT, NO_HIT\n\
\n\
/* intersectDepth defines (set in Scene/VoxelRenderResources.js)\n\
#define DEPTH_INTERSECTION_INDEX ###\n\
*/\n\
\n\
uniform mat4 u_transformPositionViewToUv;\n\
\n\
void intersectDepth(in vec2 screenCoord, in Ray ray, inout Intersections ix) {\n\
    float logDepthOrDepth = czm_unpackDepth(texture(czm_globeDepthTexture, screenCoord));\n\
    if (logDepthOrDepth != 0.0) {\n\
        // Calculate how far the ray must travel before it hits the depth buffer.\n\
        vec4 eyeCoordinateDepth = czm_screenToEyeCoordinates(screenCoord, logDepthOrDepth);\n\
        eyeCoordinateDepth /= eyeCoordinateDepth.w;\n\
        vec3 depthPositionUv = vec3(u_transformPositionViewToUv * eyeCoordinateDepth);\n\
        float t = dot(depthPositionUv - ray.pos, ray.dir);\n\
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(t, +INF_HIT));\n\
    } else {\n\
        // There's no depth at this location.\n\
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(NO_HIT));\n\
    }\n\
}\n\
";
