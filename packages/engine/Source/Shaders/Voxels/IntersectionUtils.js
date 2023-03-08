//This file is automatically rebuilt by the Cesium build process.
export default "/* Intersection defines\n\
#define INTERSECTION_COUNT ###\n\
*/\n\
\n\
#define NO_HIT (-czm_infinity)\n\
#define INF_HIT (czm_infinity * 0.5)\n\
\n\
struct Ray {\n\
    vec3 pos;\n\
    vec3 dir;\n\
};\n\
\n\
struct Intersections {\n\
    // Don't access these member variables directly - call the functions instead.\n\
\n\
    #if (INTERSECTION_COUNT > 1)\n\
        // Store an array of intersections. Each intersection is composed of:\n\
        //  x for the T value\n\
        //  y for the shape type - which encodes positive vs negative and entering vs exiting\n\
        // For example:\n\
        //  y = 0: positive shape entry\n\
        //  y = 1: positive shape exit\n\
        //  y = 2: negative shape entry\n\
        //  y = 3: negative shape exit\n\
        vec2 intersections[INTERSECTION_COUNT * 2];\n\
\n\
        // Maintain state for future nextIntersection calls\n\
        int index;\n\
        int surroundCount;\n\
        bool surroundIsPositive;\n\
    #else\n\
        // When there's only one positive shape intersection none of the extra stuff is needed.\n\
        float intersections[2];\n\
    #endif\n\
};\n\
\n\
// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.\n\
#if (INTERSECTION_COUNT > 1)\n\
    #define getIntersection(/*inout Intersections*/ ix, /*int*/ index) (ix).intersections[(index)].x\n\
#else\n\
    #define getIntersection(/*inout Intersections*/ ix, /*int*/ index) (ix).intersections[(index)]\n\
#endif\n\
\n\
// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.\n\
#define getIntersectionPair(/*inout Intersections*/ ix, /*int*/ index) vec2(getIntersection((ix), (index) * 2 + 0), getIntersection((ix), (index) * 2 + 1))\n\
\n\
// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.\n\
#if (INTERSECTION_COUNT > 1)\n\
    #define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*enter*/ enter) (ix).intersections[(index)] = vec2((t), float(!positive) * 2.0 + float(!enter))\n\
#else\n\
    #define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*enter*/ enter) (ix).intersections[(index)] = (t)\n\
#endif\n\
\n\
// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.\n\
#if (INTERSECTION_COUNT > 1)\n\
    #define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = vec2((entryExit).x, float((index) > 0) * 2.0 + 0.0); (ix).intersections[(index) * 2 + 1] = vec2((entryExit).y, float((index) > 0) * 2.0 + 1.0)\n\
#else\n\
    #define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = (entryExit).x; (ix).intersections[(index) * 2 + 1] = (entryExit).y\n\
#endif\n\
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
            vec2 intersect0 = ix.intersections[i + 0];\n\
            vec2 intersect1 = ix.intersections[i + 1];\n\
\n\
            float t0 = intersect0.x;\n\
            float t1 = intersect1.x;\n\
            float b0 = intersect0.y;\n\
            float b1 = intersect1.y;\n\
\n\
            float tmin = min(t0, t1);\n\
            float tmax = max(t0, t1);\n\
            float bmin = tmin == t0 ? b0 : b1;\n\
            float bmax = tmin == t0 ? b1 : b0;\n\
\n\
            ix.intersections[i + 0] = vec2(tmin, bmin);\n\
            ix.intersections[i + 1] = vec2(tmax, bmax);\n\
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
vec2 nextIntersection(inout Intersections ix) {\n\
    vec2 entryExitT = vec2(NO_HIT);\n\
\n\
    const int passCount = INTERSECTION_COUNT * 2;\n\
\n\
    if (ix.index == passCount) {\n\
        return entryExitT;\n\
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
        vec2 intersect = ix.intersections[i];\n\
        float t = intersect.x;\n\
        bool currShapeIsPositive = intersect.y < 2.0;\n\
        bool enter = mod(intersect.y, 2.0) == 0.0;\n\
\n\
        ix.surroundCount += enter ? +1 : -1;\n\
        ix.surroundIsPositive = currShapeIsPositive ? enter : ix.surroundIsPositive;\n\
\n\
        // entering positive or exiting negative\n\
        if (ix.surroundCount == 1 && ix.surroundIsPositive && enter == currShapeIsPositive) {\n\
            entryExitT.x = t;\n\
        }\n\
\n\
        // exiting positive or entering negative after being inside positive\n\
        // TODO: Can this be simplified?\n\
        bool exitPositive = !enter && currShapeIsPositive && ix.surroundCount == 0;\n\
        bool enterNegativeFromPositive = enter && !currShapeIsPositive && ix.surroundCount == 2 && ix.surroundIsPositive;\n\
        if (exitPositive || enterNegativeFromPositive) {\n\
            entryExitT.y = t;\n\
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
    return entryExitT;\n\
}\n\
#endif\n\
\n\
// NOTE: initializeIntersections, nextIntersection aren't even declared unless INTERSECTION_COUNT > 1\n\
// export { NO_HIT, INF_HIT, Ray, Intersections, getIntersectionPair, setIntersectionPair, initializeIntersections, nextIntersection };\n\
";
