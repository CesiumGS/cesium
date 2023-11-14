/* Intersection defines
#define INTERSECTION_COUNT ###
*/

#define NO_HIT (-czm_infinity)
#define INF_HIT (czm_infinity * 0.5)
#define RAY_SHIFT (0.000003163)
#define RAY_SCALE (1.003163)

struct Ray {
    vec3 pos;
    vec3 dir;
#if defined(SHAPE_BOX)
    vec3 dInv;
#endif
};

struct RayShapeIntersection {
    vec4 entry;
    vec4 exit;
};

struct Intersections {
    // Don't access these member variables directly - call the functions instead.

    // Store an array of ray-surface intersections. Each intersection is composed of:
    //  .xyz for the surface normal at the intersection point
    //  .w for the T value
    // The scale of the normal encodes the shape intersection type:
    //  length(intersection.xyz) = 1: positive shape entry
    //  length(intersection.xyz) = 2: positive shape exit
    //  length(intersection.xyz) = 3: negative shape entry
    //  length(intersection.xyz) = 4: negative shape exit
    // INTERSECTION_COUNT is the number of ray-*shape* (volume) intersections,
    // so we need twice as many to track ray-*surface* intersections
    vec4 intersections[INTERSECTION_COUNT * 2];

    #if (INTERSECTION_COUNT > 1)
        // Maintain state for future nextIntersection calls
        int index;
        int surroundCount;
        bool surroundIsPositive;
    #endif
};

RayShapeIntersection getFirstIntersection(in Intersections ix) 
{
    return RayShapeIntersection(ix.intersections[0], ix.intersections[1]);
}

vec4 encodeIntersectionType(vec4 intersection, int index, bool entry)
{
    float scale = float(index > 0) * 2.0 + float(!entry) + 1.0;
    return vec4(intersection.xyz * scale, intersection.w);
}

// Use defines instead of real functions because WebGL1 cannot access array with non-constant index.
#define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*bool*/ enter) (ix).intersections[(index)] = vec4(0.0, float(!positive) * 2.0 + float(!enter) + 1.0, 0.0, (t))
#define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = vec4(0.0, float((index) > 0) * 2.0 + 1.0, 0.0, (entryExit).x); (ix).intersections[(index) * 2 + 1] = vec4(0.0, float((index) > 0) * 2.0 + 2.0, 0.0, (entryExit).y)
#define setSurfaceIntersection(/*inout Intersections*/ ix, /*int*/ index, /*vec4*/ intersection) (ix).intersections[(index)] = intersection;
#define setShapeIntersection(/*inout Intersections*/ ix, /*int*/ index, /*RayShapeIntersection*/ intersection) (ix).intersections[(index) * 2 + 0] = encodeIntersectionType((intersection).entry, (index), true); (ix).intersections[(index) * 2 + 1] = encodeIntersectionType((intersection).exit, (index), false)

#if (INTERSECTION_COUNT > 1)
void initializeIntersections(inout Intersections ix) {
    // Sort the intersections from min T to max T with bubble sort.
    // Note: If this sorting function changes, some of the intersection test may
    // need to be updated. Search for "bubble sort" to find those areas.
    const int sortPasses = INTERSECTION_COUNT * 2 - 1;
    for (int n = sortPasses; n > 0; --n) {
        for (int i = 0; i < sortPasses; ++i) {
            // The loop should be: for (i = 0; i < n; ++i) {...} but WebGL1 cannot
            // loop with non-constant condition, so it has to break early instead
            if (i >= n) { break; }

            vec4 intersect0 = ix.intersections[i + 0];
            vec4 intersect1 = ix.intersections[i + 1];

            bool inOrder = intersect0.w <= intersect1.w;

            ix.intersections[i + 0] = inOrder ? intersect0 : intersect1;
            ix.intersections[i + 1] = inOrder ? intersect1 : intersect0;
        }
    }

    // Prepare initial state for nextIntersection
    ix.index = 0;
    ix.surroundCount = 0;
    ix.surroundIsPositive = false;
}
#endif

#if (INTERSECTION_COUNT > 1)
RayShapeIntersection nextIntersection(inout Intersections ix) {
    vec4 surfaceIntersection = vec4(0.0, 0.0, 0.0, NO_HIT);
    RayShapeIntersection shapeIntersection = RayShapeIntersection(surfaceIntersection, surfaceIntersection);

    const int passCount = INTERSECTION_COUNT * 2;

    if (ix.index == passCount) {
        return shapeIntersection;
    }

    for (int i = 0; i < passCount; ++i) {
        // The loop should be: for (i = ix.index; i < passCount; ++i) {...} but WebGL1 cannot
        // loop with non-constant condition, so it has to continue instead.
        if (i < ix.index) {
            continue;
        }

        ix.index = i + 1;

        surfaceIntersection = ix.intersections[i];
        int intersectionType = int(length(surfaceIntersection.xyz) - 0.5);
        bool currShapeIsPositive = intersectionType < 2;
        bool enter = intMod(intersectionType, 2) == 0;

        ix.surroundCount += enter ? +1 : -1;
        ix.surroundIsPositive = currShapeIsPositive ? enter : ix.surroundIsPositive;

        // entering positive or exiting negative
        if (ix.surroundCount == 1 && ix.surroundIsPositive && enter == currShapeIsPositive) {
            shapeIntersection.entry = surfaceIntersection;
        }

        // exiting positive or entering negative after being inside positive
        bool exitPositive = !enter && currShapeIsPositive && ix.surroundCount == 0;
        bool enterNegativeFromPositive = enter && !currShapeIsPositive && ix.surroundCount == 2 && ix.surroundIsPositive;
        if (exitPositive || enterNegativeFromPositive) {
            shapeIntersection.exit = surfaceIntersection;

            // entry and exit have been found, so the loop can stop
            if (exitPositive) {
                // After exiting positive shape there is nothing left to intersect, so jump to the end index.
                ix.index = passCount;
            }
            break;
        }
    }

    return shapeIntersection;
}
#endif

// NOTE: initializeIntersections, nextIntersection aren't even declared unless INTERSECTION_COUNT > 1
