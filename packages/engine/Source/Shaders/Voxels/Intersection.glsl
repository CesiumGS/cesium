// Main intersection function for Voxel scenes.
// See IntersectBox.glsl, IntersectCylinder.glsl, or IntersectEllipsoid.glsl
// for the definition of intersectShape. The appropriate function is selected
// based on the VoxelPrimitive shape type, and added to the shader in
// Scene/VoxelRenderResources.js.
// See also IntersectClippingPlane.glsl and IntersectDepth.glsl.
// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT,
// getFirstIntersection, initializeIntersections, nextIntersection.

/* Intersection defines (set in Scene/VoxelRenderResources.js)
#define INTERSECTION_COUNT ###
*/

RayShapeIntersection intersectScene(in vec2 screenCoord, in Ray ray, out Intersections ix) {
    // Do a ray-shape intersection to find the exact starting and ending points.
    intersectShape(ray, ix);

    // Exit early if the positive shape was completely missed or behind the ray.
    RayShapeIntersection intersection = getFirstIntersection(ix);
    if (intersection.entry.w == NO_HIT) {
        // Positive shape was completely missed - so exit early.
        return intersection;
    }

    // Clipping planes
    #if defined(CLIPPING_PLANES)
        intersectClippingPlanes(ray, ix);
    #endif

    // Depth
    intersectDepth(screenCoord, ray, ix);

    // Find the first intersection that's in front of the ray
    #if (INTERSECTION_COUNT > 1)
        initializeIntersections(ix);
        for (int i = 0; i < INTERSECTION_COUNT; ++i) {
            intersection = nextIntersection(ix);
            if (intersection.exit.w > 0.0) {
                // Set start to 0.0 when ray is inside the shape.
                intersection.entry.w = max(intersection.entry.w, 0.0);
                break;
            }
        }
    #else
        // Set start to 0.0 when ray is inside the shape.
        intersection.entry.w = max(intersection.entry.w, 0.0);
    #endif

    return intersection;
}
