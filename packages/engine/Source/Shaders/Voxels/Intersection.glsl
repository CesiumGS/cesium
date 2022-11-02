// import { Ray, NO_HIT, getIntersectionPair, initializeIntersections, nextIntersection } from "./IntersectionUtils.glsl";
// import { intersectShape } from ("./IntersectBox.glsl", "./IntersectCylinder.glsl", "IntersectEllipsoid.glsl");
// import { intersectClippingPlanes } from "./IntersectClippingPlane.glsl";
// import { intersectDepth } from "./IntersectDepth.glsl";

/* Intersection defines
#define INTERSECTION_COUNT ###
*/

vec2 intersectScene(vec2 screenCoord, vec3 positionUv, vec3 directionUv, out Intersections ix) {
    Ray ray = Ray(positionUv, directionUv);
    
    // Do a ray-shape intersection to find the exact starting and ending points.
    intersectShape(ray, ix);

    // Exit early if the positive shape was completely missed or behind the ray.
    vec2 entryExitT = getIntersectionPair(ix, 0);
    if (entryExitT.x == NO_HIT) {
        // Positive shape was completely missed - so exit early.
        return vec2(NO_HIT);
    }

    // Clipping planes
    #if defined(CLIPPING_PLANES)
        intersectClippingPlanes(ray, ix);
    #endif

    // Depth
    #if defined(DEPTH_TEST)
        intersectDepth(screenCoord, ray, ix);
    #endif

    // Find the first intersection that's in front of the ray
    #if (INTERSECTION_COUNT > 1)
        initializeIntersections(ix);
        for (int i = 0; i < INTERSECTION_COUNT; ++i) {
            entryExitT = nextIntersection(ix);
            if (entryExitT.y > 0.0) {
                // Set start to 0.0 when ray is inside the shape.
                entryExitT.x = max(entryExitT.x, 0.0);
                break;
            }
        }
    #else
        // Set start to 0.0 when ray is inside the shape.
        entryExitT.x = max(entryExitT.x, 0.0);
    #endif

    return entryExitT;
}

// export { intersectScene };
