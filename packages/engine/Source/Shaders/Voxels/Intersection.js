//This file is automatically rebuilt by the Cesium build process.
export default "// Main intersection function for Voxel scenes.\n\
// See IntersectBox.glsl, IntersectCylinder.glsl, or IntersectEllipsoid.glsl\n\
// for the definition of intersectShape. The appropriate function is selected\n\
// based on the VoxelPrimitive shape type, and added to the shader in\n\
// Scene/VoxelRenderResources.js.\n\
// See also IntersectClippingPlane.glsl and IntersectDepth.glsl.\n\
// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT,\n\
// getFirstIntersection, initializeIntersections, nextIntersection.\n\
\n\
/* Intersection defines (set in Scene/VoxelRenderResources.js)\n\
#define INTERSECTION_COUNT ###\n\
*/\n\
\n\
RayShapeIntersection intersectScene(in vec2 screenCoord, in Ray ray, out Intersections ix) {\n\
    // Do a ray-shape intersection to find the exact starting and ending points.\n\
    intersectShape(ray, ix);\n\
\n\
    // Exit early if the positive shape was completely missed or behind the ray.\n\
    RayShapeIntersection intersection = getFirstIntersection(ix);\n\
    if (intersection.entry.w == NO_HIT) {\n\
        // Positive shape was completely missed - so exit early.\n\
        return intersection;\n\
    }\n\
\n\
    // Clipping planes\n\
    #if defined(CLIPPING_PLANES)\n\
        intersectClippingPlanes(ray, ix);\n\
    #endif\n\
\n\
    // Depth\n\
    #if defined(DEPTH_TEST)\n\
        intersectDepth(screenCoord, ray, ix);\n\
    #endif\n\
\n\
    // Find the first intersection that's in front of the ray\n\
    #if (INTERSECTION_COUNT > 1)\n\
        initializeIntersections(ix);\n\
        for (int i = 0; i < INTERSECTION_COUNT; ++i) {\n\
            intersection = nextIntersection(ix);\n\
            if (intersection.exit.w > 0.0) {\n\
                // Set start to 0.0 when ray is inside the shape.\n\
                intersection.entry.w = max(intersection.entry.w, 0.0);\n\
                break;\n\
            }\n\
        }\n\
    #else\n\
        // Set start to 0.0 when ray is inside the shape.\n\
        intersection.entry.w = max(intersection.entry.w, 0.0);\n\
    #endif\n\
\n\
    return intersection;\n\
}\n\
";
