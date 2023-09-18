//This file is automatically rebuilt by the Cesium build process.
export default "/* Intersection defines\n\
#define INTERSECTION_COUNT ###\n\
*/\n\
\n\
#define NO_HIT (-czm_infinity)\n\
#define INF_HIT (czm_infinity * 0.5)\n\
#define RAY_SHIFT (0.000003163)\n\
#define RAY_SCALE (1.003163)\n\
\n\
struct Ray {\n\
    vec3 pos;\n\
    vec3 dir;\n\
#if defined(SHAPE_BOX)\n\
    vec3 dInv;\n\
#endif\n\
};\n\
\n\
struct RayShapeIntersection {\n\
    vec4 entry;\n\
    vec4 exit;\n\
};\n\
\n\
struct Intersections {\n\
    // Don't access these member variables directly - call the functions instead.\n\
\n\
    // Store an array of ray-surface intersections. Each intersection is composed of:\n\
    //  .xyz for the surface normal at the intersection point\n\
    //  .w for the T value\n\
    // The scale of the normal encodes the shape intersection type:\n\
    //  length(intersection.xyz) = 1: positive shape entry\n\
    //  length(intersection.xyz) = 2: positive shape exit\n\
    //  length(intersection.xyz) = 3: negative shape entry\n\
    //  length(intersection.xyz) = 4: negative shape exit\n\
    // INTERSECTION_COUNT is the number of ray-*shape* (volume) intersections,\n\
    // so we need twice as many to track ray-*surface* intersections\n\
    vec4 intersections[INTERSECTION_COUNT * 2];\n\
\n\
    #if (INTERSECTION_COUNT > 1)\n\
        // Maintain state for future nextIntersection calls\n\
        int index;\n\
        int surroundCount;\n\
        bool surroundIsPositive;\n\
    #endif\n\
};\n\
\n\
RayShapeIntersection getFirstIntersection(in Intersections ix) \n\
{\n\
    return RayShapeIntersection(ix.intersections[0], ix.intersections[1]);\n\
}\n\
\n\
vec4 encodeIntersectionType(vec4 intersection, int index, bool entry)\n\
{\n\
    float scale = float(index > 0) * 2.0 + float(!entry) + 1.0;\n\
    return vec4(intersection.xyz * scale, intersection.w);\n\
}\n\
\n\
// Use defines instead of real functions because WebGL1 cannot access array with non-constant index.\n\
#define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*bool*/ enter) (ix).intersections[(index)] = vec4(0.0, float(!positive) * 2.0 + float(!enter) + 1.0, 0.0, (t))\n\
#define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = vec4(0.0, float((index) > 0) * 2.0 + 1.0, 0.0, (entryExit).x); (ix).intersections[(index) * 2 + 1] = vec4(0.0, float((index) > 0) * 2.0 + 2.0, 0.0, (entryExit).y)\n\
#define setSurfaceIntersection(/*inout Intersections*/ ix, /*int*/ index, /*vec4*/ intersection) (ix).intersections[(index)] = intersection;\n\
#define setShapeIntersection(/*inout Intersections*/ ix, /*int*/ index, /*RayShapeIntersection*/ intersection) (ix).intersections[(index) * 2 + 0] = encodeIntersectionType((intersection).entry, (index), true); (ix).intersections[(index) * 2 + 1] = encodeIntersectionType((intersection).exit, (index), false)\n\
\n\
#if (INTERSECTION_COUNT > 1)\n\
void initializeIntersections(inout Intersections ix) {\n\
    // Sort the intersections from min T to max T with bubble sort.\n\
    // Note: If this sorting function changes, some of the intersection test may\n\
    // need to be updated. Search for \"bubble sort\" to find those areas.\n\
    const int sortPasses = INTERSECTION_COUNT * 2 - 1;\n\
    for (int n = sortPasses; n > 0; --n) {\n\
        for (int i = 0; i < sortPasses; ++i) {\n\
            // The loop should be: for (i = 0; i < n; ++i) {...} but WebGL1 cannot\n\
            // loop with non-constant condition, so it has to break early instead\n\
            if (i >= n) { break; }\n\
\n\
            vec4 intersect0 = ix.intersections[i + 0];\n\
            vec4 intersect1 = ix.intersections[i + 1];\n\
\n\
            bool inOrder = intersect0.w <= intersect1.w;\n\
\n\
            ix.intersections[i + 0] = inOrder ? intersect0 : intersect1;\n\
            ix.intersections[i + 1] = inOrder ? intersect1 : intersect0;\n\
        }\n\
    }\n\
\n\
    // Prepare initial state for nextIntersection\n\
    ix.index = 0;\n\
    ix.surroundCount = 0;\n\
    ix.surroundIsPositive = false;\n\
}\n\
#endif\n\
\n\
#if (INTERSECTION_COUNT > 1)\n\
RayShapeIntersection nextIntersection(inout Intersections ix) {\n\
    vec4 surfaceIntersection = vec4(0.0, 0.0, 0.0, NO_HIT);\n\
    RayShapeIntersection shapeIntersection = RayShapeIntersection(surfaceIntersection, surfaceIntersection);\n\
\n\
    const int passCount = INTERSECTION_COUNT * 2;\n\
\n\
    if (ix.index == passCount) {\n\
        return shapeIntersection;\n\
    }\n\
\n\
    for (int i = 0; i < passCount; ++i) {\n\
        // The loop should be: for (i = ix.index; i < passCount; ++i) {...} but WebGL1 cannot\n\
        // loop with non-constant condition, so it has to continue instead.\n\
        if (i < ix.index) {\n\
            continue;\n\
        }\n\
\n\
        ix.index = i + 1;\n\
\n\
        surfaceIntersection = ix.intersections[i];\n\
        int intersectionType = int(length(surfaceIntersection.xyz) - 0.5);\n\
        bool currShapeIsPositive = intersectionType < 2;\n\
        bool enter = intMod(intersectionType, 2) == 0;\n\
\n\
        ix.surroundCount += enter ? +1 : -1;\n\
        ix.surroundIsPositive = currShapeIsPositive ? enter : ix.surroundIsPositive;\n\
\n\
        // entering positive or exiting negative\n\
        if (ix.surroundCount == 1 && ix.surroundIsPositive && enter == currShapeIsPositive) {\n\
            shapeIntersection.entry = surfaceIntersection;\n\
        }\n\
\n\
        // exiting positive or entering negative after being inside positive\n\
        bool exitPositive = !enter && currShapeIsPositive && ix.surroundCount == 0;\n\
        bool enterNegativeFromPositive = enter && !currShapeIsPositive && ix.surroundCount == 2 && ix.surroundIsPositive;\n\
        if (exitPositive || enterNegativeFromPositive) {\n\
            shapeIntersection.exit = surfaceIntersection;\n\
\n\
            // entry and exit have been found, so the loop can stop\n\
            if (exitPositive) {\n\
                // After exiting positive shape there is nothing left to intersect, so jump to the end index.\n\
                ix.index = passCount;\n\
            }\n\
            break;\n\
        }\n\
    }\n\
\n\
    return shapeIntersection;\n\
}\n\
#endif\n\
\n\
// NOTE: initializeIntersections, nextIntersection aren't even declared unless INTERSECTION_COUNT > 1\n\
";
