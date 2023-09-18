//This file is automatically rebuilt by the Cesium build process.
export default "// See IntersectionUtils.glsl for the definitions of Ray, Intersections, INF_HIT,\n\
// NO_HIT, setIntersectionPair\n\
\n\
/* Clipping plane defines (set in Scene/VoxelRenderResources.js)\n\
#define CLIPPING_PLANES_UNION\n\
#define CLIPPING_PLANES_COUNT\n\
#define CLIPPING_PLANES_INTERSECTION_INDEX\n\
*/\n\
\n\
uniform sampler2D u_clippingPlanesTexture;\n\
uniform mat4 u_clippingPlanesMatrix;\n\
\n\
// Plane is in Hessian Normal Form\n\
vec4 intersectPlane(in Ray ray, in vec4 plane) {\n\
    vec3 n = plane.xyz; // normal\n\
    float w = plane.w; // -dot(pointOnPlane, normal)\n\
\n\
    float a = dot(ray.pos, n);\n\
    float b = dot(ray.dir, n);\n\
    float t = -(w + a) / b;\n\
\n\
    return vec4(n, t);\n\
}\n\
\n\
void intersectClippingPlanes(in Ray ray, inout Intersections ix) {\n\
    vec4 backSide = vec4(-ray.dir, -INF_HIT);\n\
    vec4 farSide = vec4(ray.dir, +INF_HIT);\n\
    RayShapeIntersection clippingVolume;\n\
\n\
    #if (CLIPPING_PLANES_COUNT == 1)\n\
        // Union and intersection are the same when there's one clipping plane, and the code\n\
        // is more simplified.\n\
        vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, 0, u_clippingPlanesMatrix);\n\
        vec4 intersection = intersectPlane(ray, planeUv);\n\
        bool reflects = dot(ray.dir, intersection.xyz) < 0.0;\n\
        clippingVolume.entry = reflects ? backSide : intersection;\n\
        clippingVolume.exit = reflects ? intersection : farSide;\n\
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX, clippingVolume);\n\
    #elif defined(CLIPPING_PLANES_UNION)\n\
        vec4 firstTransmission = vec4(ray.dir, +INF_HIT);\n\
        vec4 lastReflection = vec4(-ray.dir, -INF_HIT);\n\
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {\n\
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);\n\
            vec4 intersection = intersectPlane(ray, planeUv);\n\
            if (dot(ray.dir, planeUv.xyz) > 0.0) {\n\
                firstTransmission = intersection.w <= firstTransmission.w ? intersection : firstTransmission;\n\
            } else {\n\
                lastReflection = intersection.w >= lastReflection.w ? intersection : lastReflection;\n\
            }\n\
        }\n\
        clippingVolume.entry = backSide;\n\
        clippingVolume.exit = lastReflection;\n\
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 0, clippingVolume);\n\
        clippingVolume.entry = firstTransmission;\n\
        clippingVolume.exit = farSide;\n\
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 1, clippingVolume);\n\
    #else // intersection\n\
        vec4 lastTransmission = vec4(ray.dir, -INF_HIT);\n\
        vec4 firstReflection = vec4(-ray.dir, +INF_HIT);\n\
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {\n\
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);\n\
            vec4 intersection = intersectPlane(ray, planeUv);\n\
            if (dot(ray.dir, planeUv.xyz) > 0.0) {\n\
                lastTransmission = intersection.w > lastTransmission.w ? intersection : lastTransmission;\n\
            } else {\n\
                firstReflection = intersection.w < firstReflection.w ? intersection: firstReflection;\n\
            }\n\
        }\n\
        if (lastTransmission.w < firstReflection.w) {\n\
            clippingVolume.entry = lastTransmission;\n\
            clippingVolume.exit = firstReflection;\n\
        } else {\n\
            clippingVolume.entry = vec4(-ray.dir, NO_HIT);\n\
            clippingVolume.exit = vec4(ray.dir, NO_HIT);\n\
        }\n\
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX, clippingVolume);\n\
    #endif\n\
}\n\
";
