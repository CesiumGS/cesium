// import { Ray, Intersections, INF_HIT, NO_HIT, setIntersectionPair } from "./IntersectionUtils.glsl";

/* Clipping plane defines
#define CLIPPING_PLANES_UNION
#define CLIPPING_PLANES_COUNT
#define CLIPPING_PLANES_INTERSECTION_INDEX
*/

uniform sampler2D u_clippingPlanesTexture;
uniform mat4 u_clippingPlanesMatrix;

// Plane is in Hessian Normal Form
vec2 intersectPlane(Ray ray, vec4 plane) {
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    vec3 n = plane.xyz; // normal
    float w = plane.w; // -dot(pointOnPlane, normal)

    float a = dot(o, n);
    float b = dot(d, n);
    float t = -(w + a) / b;

    if (dot(d, n) > 0.0) {
        return vec2(t, +INF_HIT);
    } else {
        return vec2(-INF_HIT, t);
    }
}

void intersectClippingPlanes(Ray ray, inout Intersections ix) {
    #if (CLIPPING_PLANES_COUNT == 1)
        // Union and intersection are the same when there's one clipping plane, and the code
        // is more simplified.
        vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, 0, u_clippingPlanesMatrix);
        vec2 intersection = intersectPlane(ray, planeUv);
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, intersection);
    #elif defined(CLIPPING_PLANES_UNION)
        float minPositiveT = +INF_HIT;
        float maxNegativeT = -INF_HIT;
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec2 intersection = intersectPlane(ray, planeUv);
            if (intersection.y == +INF_HIT) {
                minPositiveT = min(minPositiveT, intersection.x);
            } else {
                maxNegativeT = max(maxNegativeT, intersection.y);
            }
        }
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 0, vec2(-INF_HIT, maxNegativeT));
        setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 1, vec2(minPositiveT, +INF_HIT));
    #else // intersection
        float maxPositiveT = -INF_HIT;
        float minNegativeT = +INF_HIT;
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec2 intersection = intersectPlane(ray, planeUv);
            if (intersection.y == +INF_HIT) {
                maxPositiveT = max(maxPositiveT, intersection.x);
            } else {
                minNegativeT = min(minNegativeT, intersection.y);
            }
        }
        if (maxPositiveT < minNegativeT) {
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(maxPositiveT, minNegativeT));
        } else {
            setIntersectionPair(ix, CLIPPING_PLANES_INTERSECTION_INDEX, vec2(NO_HIT));
        }
    #endif
}

// export { intersectClippingPlanes };