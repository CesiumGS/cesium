// See IntersectionUtils.glsl for the definitions of Ray, Intersections, INF_HIT,
// NO_HIT, setIntersectionPair

/* Clipping plane defines (set in Scene/VoxelRenderResources.js)
#define CLIPPING_PLANES_UNION
#define CLIPPING_PLANES_COUNT
#define CLIPPING_PLANES_INTERSECTION_INDEX
*/

uniform sampler2D u_clippingPlanesTexture;
uniform mat4 u_clippingPlanesMatrix;

// Plane is in Hessian Normal Form
vec4 intersectPlane(in Ray ray, in vec4 plane) {
    vec3 n = plane.xyz; // normal
    float w = plane.w; // -dot(pointOnPlane, normal)

    float a = dot(ray.pos, n);
    float b = dot(ray.dir, n);
    float t = -(w + a) / b;

    return vec4(n, t);
}

void intersectClippingPlanes(in Ray ray, inout Intersections ix) {
    #if (CLIPPING_PLANES_COUNT == 1)
        // Union and intersection are the same when there's one clipping plane, and the code
        // is more simplified.
        vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, 0, u_clippingPlanesMatrix);
        vec4 intersection = intersectPlane(ray, planeUv);
        vec2 entryExitT = dot(ray.dir, planeUv.xyz) > 0.0
            ? vec2(intersection.w, +INF_HIT)
            : vec2(-INF_HIT, intersection.w);
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, entryExitT);
    #elif defined(CLIPPING_PLANES_UNION)
        float minPositiveT = +INF_HIT;
        float maxNegativeT = -INF_HIT;
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec4 intersection = intersectPlane(ray, planeUv);
            if (dot(ray.dir, planeUv.xyz) > 0.0) {
                minPositiveT = min(minPositiveT, intersection.w);
            } else {
                maxNegativeT = max(maxNegativeT, intersection.w);
            }
        }
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 0, vec2(-INF_HIT, maxNegativeT));
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 1, vec2(minPositiveT, +INF_HIT));
    #else // intersection
        float maxPositiveT = -INF_HIT;
        float minNegativeT = +INF_HIT;
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec4 intersection = intersectPlane(ray, planeUv);
            if (dot(ray.dir, planeUv.xyz) > 0.0) {
                maxPositiveT = max(maxPositiveT, intersection.w);
            } else {
                minNegativeT = min(minNegativeT, intersection.w);
            }
        }
        if (maxPositiveT < minNegativeT) {
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(maxPositiveT, minNegativeT));
        } else {
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(NO_HIT));
        }
    #endif
}
