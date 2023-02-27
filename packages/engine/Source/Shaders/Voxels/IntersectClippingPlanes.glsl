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
    vec4 backSide = vec4(-ray.dir, -INF_HIT);
    vec4 farSide = vec4(ray.dir, +INF_HIT);
    RayShapeIntersection clippingVolume;

    #if (CLIPPING_PLANES_COUNT == 1)
        // Union and intersection are the same when there's one clipping plane, and the code
        // is more simplified.
        vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, 0, u_clippingPlanesMatrix);
        vec4 intersection = intersectPlane(ray, planeUv);
        bool reflects = dot(ray.dir, intersection.xyz) < 0.0;
        clippingVolume.entry = reflects ? backSide : intersection;
        clippingVolume.exit = reflects ? intersection : farSide;
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX, clippingVolume);
    #elif defined(CLIPPING_PLANES_UNION)
        vec4 firstTransmission = vec4(ray.dir, +INF_HIT);
        vec4 lastReflection = vec4(-ray.dir, -INF_HIT);
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec4 intersection = intersectPlane(ray, planeUv);
            if (dot(ray.dir, planeUv.xyz) > 0.0) {
                firstTransmission = intersection.w <= firstTransmission.w ? intersection : firstTransmission;
            } else {
                lastReflection = intersection.w >= lastReflection.w ? intersection : lastReflection;
            }
        }
        clippingVolume.entry = backSide;
        clippingVolume.exit = lastReflection;
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 0, clippingVolume);
        clippingVolume.entry = firstTransmission;
        clippingVolume.exit = farSide;
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX + 1, clippingVolume);
    #else // intersection
        vec4 lastTransmission = vec4(ray.dir, -INF_HIT);
        vec4 firstReflection = vec4(-ray.dir, +INF_HIT);
        for (int i = 0; i < CLIPPING_PLANES_COUNT; i++) {
            vec4 planeUv = getClippingPlane(u_clippingPlanesTexture, i, u_clippingPlanesMatrix);
            vec4 intersection = intersectPlane(ray, planeUv);
            if (dot(ray.dir, planeUv.xyz) > 0.0) {
                lastTransmission = intersection.w > lastTransmission.w ? intersection : lastTransmission;
            } else {
                firstReflection = intersection.w < firstReflection.w ? intersection: firstReflection;
            }
        }
        if (lastTransmission.w < firstReflection.w) {
            clippingVolume.entry = lastTransmission;
            clippingVolume.exit = firstReflection;
        } else {
            clippingVolume.entry = vec4(-ray.dir, NO_HIT);
            clippingVolume.exit = vec4(ray.dir, NO_HIT);
        }
        setShapeIntersection(ix, CLIPPING_PLANES_INTERSECTION_INDEX, clippingVolume);
    #endif
}
