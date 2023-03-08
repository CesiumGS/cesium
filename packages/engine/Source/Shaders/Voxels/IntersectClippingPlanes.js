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
vec2 intersectPlane(Ray ray, vec4 plane) {\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
    vec3 n = plane.xyz; // normal\n\
    float w = plane.w; // -dot(pointOnPlane, normal)\n\
\n\
    float a = dot(o, n);\n\
    float b = dot(d, n);\n\
    float t = -(w + a) / b;\n\
\n\
    if (dot(d, n) > 0.0) {\n\
        return vec2(t, +INF_HIT);\n\
    } else {\n\
        return vec2(-INF_HIT, t);\n\
    }\n\
}\n\
\n\
void intersectClippingPlanes(Ray ray, inout Intersections ix) {\n\
    #if (CLIPPING_PLANES_COUNT == 1)\n\
        // Union and intersection are the same when there's one clipping plane, and the code\n\
        // is more simplified.\n\
        vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, 0, u_clippingPlanesMatrix);\n\
        vec2 intersection = intersectPlane(ray, planeUv);\n\
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, intersection);\n\
    #elif defined(CLIPPING_PLANES_UNION)\n\
        float minPositiveT = +INF_HIT;\n\
        float maxNegativeT = -INF_HIT;\n\
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {\n\
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);\n\
            vec2 intersection = intersectPlane(ray, planeUv);\n\
            if (intersection.y == +INF_HIT) {\n\
                minPositiveT = min(minPositiveT, intersection.x);\n\
            } else {\n\
                maxNegativeT = max(maxNegativeT, intersection.y);\n\
            }\n\
        }\n\
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 0, vec2(-INF_HIT, maxNegativeT));\n\
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 1, vec2(minPositiveT, +INF_HIT));\n\
    #else // intersection\n\
        float maxPositiveT = -INF_HIT;\n\
        float minNegativeT = +INF_HIT;\n\
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {\n\
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);\n\
            vec2 intersection = intersectPlane(ray, planeUv);\n\
            if (intersection.y == +INF_HIT) {\n\
                maxPositiveT = max(maxPositiveT, intersection.x);\n\
            } else {\n\
                minNegativeT = min(minNegativeT, intersection.y);\n\
            }\n\
        }\n\
        if (maxPositiveT < minNegativeT) {\n\
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(maxPositiveT, minNegativeT));\n\
        } else {\n\
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(NO_HIT));\n\
        }\n\
    #endif\n\
}\n\
";
