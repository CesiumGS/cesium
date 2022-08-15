// These octree flags must be in sync with GpuOctreeFlag in VoxelTraversal.js
#define OCTREE_FLAG_INTERNAL 0
#define OCTREE_FLAG_LEAF 1
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2

#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops
#define OCTREE_MAX_LEVELS 32 // Harcoded value because GLSL doesn't like variable length loops
#define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0

#define NO_HIT (-czm_infinity)
#define INF_HIT (czm_infinity * 0.5)

uniform ivec3 u_dimensions; // does not include padding
#if defined(PADDING)
    uniform ivec3 u_paddingBefore;
    uniform ivec3 u_paddingAfter;
#endif

#if defined(MEGATEXTURE_2D)
    uniform ivec2 u_megatextureSliceDimensions; // number of slices per tile, in two dimensions
    uniform ivec2 u_megatextureTileDimensions; // number of tiles per megatexture, in two dimensions
    uniform vec2 u_megatextureVoxelSizeUv;
    uniform vec2 u_megatextureSliceSizeUv;
    uniform vec2 u_megatextureTileSizeUv;
#endif

uniform sampler2D u_octreeInternalNodeTexture;
uniform vec2 u_octreeInternalNodeTexelSizeUv;
uniform int u_octreeInternalNodeTilesPerRow;
uniform sampler2D u_octreeLeafNodeTexture;
uniform vec2 u_octreeLeafNodeTexelSizeUv;
uniform int u_octreeLeafNodeTilesPerRow;

struct OctreeNodeData {
    int data;
    int flag;
};

struct TraversalData {
    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
    float stepT;
    ivec4 octreeCoords;
    int parentOctreeIndex;
};

struct SampleData {
    int megatextureIndex;
    bool usingParentMegatextureIndex;
    vec3 tileUv;
    #if (SAMPLE_COUNT > 1)
        float weight;
    #endif
};

uniform mat4 u_transformPositionViewToUv;
uniform mat4 u_transformPositionUvToView;
uniform mat3 u_transformDirectionViewToLocal;
uniform mat3 u_transformNormalLocalToWorld;
uniform vec3 u_cameraPositionUv;
uniform float u_stepSize;

#if defined(PICKING)
    uniform vec4 u_pickColor;
#endif

#if defined(CLIPPING_PLANES)
    uniform sampler2D u_clippingPlanesTexture;
    uniform mat4 u_clippingPlanesMatrix;
#endif

#if defined(SHAPE_BOX)
    /* Box defines:
    #define BOX_INTERSECTION_INDEX ### // always 0
    #define BOX_HAS_SHAPE_BOUND
    #define BOX_HAS_RENDER_BOUND
    #define BOX_IS_2D
    */

    // Box uniforms:
    #if defined(BOX_HAS_SHAPE_BOUND)
        uniform vec3 u_boxScaleUvToShapeBoundsUv;
        uniform vec3 u_boxOffsetUvToShapeBoundsUv;
    #endif
    #if defined(BOX_HAS_RENDER_BOUND)
        #if defined(BOX_IS_2D)
            // This matrix bakes in an axis conversion so that the math works for XY plane.
            uniform mat4 u_boxTransformUvToRenderBounds;
        #else
            // Similar to u_boxTransformUvToBounds but fewer instructions needed.
            uniform vec3 u_boxScaleUvToRenderBounds;
            uniform vec3 u_boxOffsetUvToRenderBounds;
        #endif
    #endif
#endif

// --------------------------------------------------------
// Misc math
// --------------------------------------------------------
struct Ray {
    vec3 pos;
    vec3 dir;
};

#if defined(JITTER)
float hash(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * 50.0); // magic number = hashscale
	p3 += dot(p3, p3.yzx + 19.19);
	return fract((p3.x + p3.y) * p3.z);
}
#endif

int intMod(int a, int b) {
    return a - (b * (a / b));
}
int intMin(int a, int b) {
    return a <= b ? a : b;
}
int intMax(int a, int b) {
    return a >= b ? a : b;
}
int intClamp(int v, int minVal, int maxVal) {
    return intMin(intMax(v, minVal), maxVal);
}
bool inRange(float v, float minVal, float maxVal) {
    return clamp(v, minVal, maxVal) == v;
}
bool inRange(vec3 v, vec3 minVal, vec3 maxVal) {
    return clamp(v, minVal, maxVal) == v;
}
int normU8_toInt(float value) {
    return int(value * 255.0);
}
int normU8x2_toInt(vec2 value) {
    return int(value.x * 255.0) + 256 * int(value.y * 255.0);
}
float normU8x2_toFloat(vec2 value) {
    return float(normU8x2_toInt(value)) / 65535.0;
}
vec2 index1DTo2DTexcoord(int index, ivec2 dimensions, vec2 uvScale)
{
    int indexX = intMod(index, dimensions.x);
    int indexY = index / dimensions.x;
    return vec2(indexX, indexY) * uvScale;
}

// --------------------------------------------------------
// Intersection tests, shape coordinate conversions, etc
// --------------------------------------------------------
#if defined(SHAPE_BOX)
vec2 intersectUnitCube(Ray ray) // Unit cube from [-1, +1]
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
                
    vec3 dInv = 1.0 / d;
    vec3 od = -o * dInv;
    vec3 t0 = od - dInv;
    vec3 t1 = od + dInv;
    vec3 m0 = min(t0, t1);
    vec3 m1 = max(t0, t1);
    float tMin = max(max(m0.x, m0.y), m0.z);
    float tMax = min(min(m1.x, m1.y), m1.z);
    
    if (tMin >= tMax) {
        return vec2(NO_HIT);
    }

    return vec2(tMin, tMax);
}
#endif

#if defined(SHAPE_BOX)
vec2 intersectUnitSquare(Ray ray) // Unit square from [-1, +1]
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;

    float t = -o.z / d.z;
    vec2 planePos = o.xy + d.xy * t;
    if (any(greaterThan(abs(planePos), vec2(1.0)))) {
        return vec2(NO_HIT);
    }

    return vec2(t, t);
}
#endif

#if defined(CLIPPING_PLANES)
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
#endif

struct Intersections {
    // Don't access these member variables directly - call the functions instead.

    #if (INTERSECTION_COUNT > 1)
        // Store an array of intersections. Each intersection is composed of:
        //  x for the T value
        //  y for the shape type - which encodes positive vs negative and entering vs exiting
        // For example:
        //  y = 0: positive shape entry
        //  y = 1: positive shape exit
        //  y = 2: negative shape entry
        //  y = 3: negative shape exit
        vec2 intersections[INTERSECTION_COUNT * 2];

        // Maintain state for future nextIntersection calls
        int index;
        int surroundCount;
        bool surroundIsPositive;
    #else
        // When there's only one positive shape intersection none of the extra stuff is needed.
        float intersections[2];
    #endif
};

// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.
#if (INTERSECTION_COUNT > 1)
    #define getIntersection(/*inout Intersections*/ ix, /*int*/ index) (ix).intersections[(index)].x
#else
    #define getIntersection(/*inout Intersections*/ ix, /*int*/ index) (ix).intersections[(index)]
#endif

// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.
#define getIntersectionPair(/*inout Intersections*/ ix, /*int*/ index) vec2(getIntersection((ix), (index) * 2 + 0), getIntersection((ix), (index) * 2 + 1))

// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.
#if (INTERSECTION_COUNT > 1)
    #define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*enter*/ enter) (ix).intersections[(index)] = vec2((t), float(!positive) * 2.0 + float(!enter))
#else
    #define setIntersection(/*inout Intersections*/ ix, /*int*/ index, /*float*/ t, /*bool*/ positive, /*enter*/ enter) (ix).intersections[(index)] = (t)
#endif

// Using a define instead of a real function because WebGL1 cannot access array with non-constant index.
#if (INTERSECTION_COUNT > 1)
    #define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = vec2((entryExit).x, float((index) > 0) * 2.0 + 0.0); (ix).intersections[(index) * 2 + 1] = vec2((entryExit).y, float((index) > 0) * 2.0 + 1.0)
#else
    #define setIntersectionPair(/*inout Intersections*/ ix, /*int*/ index, /*vec2*/ entryExit) (ix).intersections[(index) * 2 + 0] = (entryExit).x; (ix).intersections[(index) * 2 + 1] = (entryExit).y
#endif

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
            
            vec2 intersect0 = ix.intersections[i + 0];
            vec2 intersect1 = ix.intersections[i + 1];

            float t0 = intersect0.x;
            float t1 = intersect1.x;
            float b0 = intersect0.y;
            float b1 = intersect1.y;

            float tmin = min(t0, t1);
            float tmax = max(t0, t1);
            float bmin = tmin == t0 ? b0 : b1;
            float bmax = tmin == t0 ? b1 : b0;

            ix.intersections[i + 0] = vec2(tmin, bmin);
            ix.intersections[i + 1] = vec2(tmax, bmax);            
        }
    }

    // Prepare initial state for nextIntersection
    ix.index = 0;
    ix.surroundCount = 0;
    ix.surroundIsPositive = false;
}
#endif

#if (INTERSECTION_COUNT > 1)
vec2 nextIntersection(inout Intersections ix) {
    vec2 entryExitT = vec2(NO_HIT);

    const int passCount = INTERSECTION_COUNT * 2;
    for (int i = 0; i < passCount; ++i) {
        // The loop should be: for (i = ix.index; i < passCount; ++i) {...} but WebGL1 cannot
        // loop with non-constant condition, so it has to continue instead.
        if (i < ix.index) {
            continue;
        }

        vec2 intersect = ix.intersections[i];
        float t = intersect.x;
        bool currShapeIsPositive = intersect.y < 2.0;
        bool enter = mod(intersect.y, 2.0) == 0.0;

        ix.surroundCount += enter ? +1 : -1;
        ix.surroundIsPositive = currShapeIsPositive ? enter : ix.surroundIsPositive;
        
        // entering positive or exiting negative
        if (ix.surroundCount == 1 && ix.surroundIsPositive && enter == currShapeIsPositive) {
            entryExitT.x = t;
        }
        
        // exiting positive or entering negative after being inside positive
        // TODO: Can this be simplified?
        bool exitPositive = !enter && currShapeIsPositive && ix.surroundCount == 0;
        bool enterNegativeFromPositive = enter && !currShapeIsPositive && ix.surroundCount == 2 && ix.surroundIsPositive;
        if (exitPositive || enterNegativeFromPositive) {
            entryExitT.y = t;

            // entry and exit have been found, so the loop can stop
            if (exitPositive) {
                // After exiting positive shape there is nothing left to intersect, so jump to the end index.
                ix.index = passCount;
            } else {
                // There could be more intersections against the positive shape in the future.
                ix.index = i + 1;
            }
            break;
        }
    }

    return entryExitT;
}
#endif

#if defined(SHAPE_BOX)
void intersectShape(Ray ray, inout Intersections ix)
{
    #if defined(BOX_HAS_RENDER_BOUND)
        #if defined(BOX_IS_2D)
            // Transform the ray into unit square space on Z plane
            // This matrix bakes in an axis conversion so that the math works for XY plane.
            ray.pos = vec3(u_boxTransformUvToRenderBounds * vec4(ray.pos, 1.0));
            ray.dir = vec3(u_boxTransformUvToRenderBounds * vec4(ray.dir, 0.0));
            vec2 entryExit = intersectUnitSquare(ray);
        #else
            // Transform the ray into unit cube space
            ray.pos = ray.pos * u_boxScaleUvToRenderBounds + u_boxOffsetUvToRenderBounds;
            ray.dir *= u_boxScaleUvToRenderBounds;
            vec2 entryExit = intersectUnitCube(ray);
        #endif
    #else
        // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
        // Direction is scaled as well to be in sync with position. 
        ray.pos = ray.pos * 2.0 - 1.0;
        ray.dir = ray.dir * 2.0;
        vec2 entryExit = intersectUnitCube(ray);
    #endif

    setIntersectionPair(ix, BOX_INTERSECTION_INDEX, entryExit);
}
#endif

#if defined(SHAPE_BOX)
vec3 convertUvToShapeUvSpace(in vec3 positionUv) {
    #if defined(BOX_HAS_SHAPE_BOUND)
        return positionUv * u_boxScaleUvToShapeBoundsUv + u_boxOffsetUvToShapeBoundsUv;
    #else
        return positionUv;
    #endif
}
#endif

#if defined(CLIPPING_PLANES)
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
#endif

#if defined(DEPTH_TEST)
void intersectDepth(vec2 screenCoord, Ray ray, inout Intersections ix) {
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, screenCoord));
    if (logDepthOrDepth != 0.0) {
        // Calculate how far the ray must travel before it hits the depth buffer.
        vec4 eyeCoordinateDepth = czm_screenToEyeCoordinates(screenCoord, logDepthOrDepth);
        eyeCoordinateDepth /= eyeCoordinateDepth.w;
        vec3 depthPositionUv = vec3(u_transformPositionViewToUv * eyeCoordinateDepth);
        float t = dot(depthPositionUv - ray.pos, ray.dir);
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(t, +INF_HIT));
    } else {
        // There's no depth at this location.
        setIntersectionPair(ix, DEPTH_INTERSECTION_INDEX, vec2(NO_HIT));
    }
}
#endif

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

// --------------------------------------------------------
// Megatexture
// --------------------------------------------------------
/*
    How is 3D data stored in a 2D megatexture?

    In this example there is only one loaded tile and it has 2x2x2 voxels (8 voxels total).
    The data is sliced by Z. The data at Z = 0 is placed in texels (0,0), (0,1), (1,0), (1,1) and
    the data at Z = 1 is placed in texels (2,0), (2,1), (3,0), (3,1).
    Note that there could be empty space in the megatexture because it's a power of two.

      0   1   2   3
    +---+---+---+---+
    |   |   |   |   | 3
    +---+---+---+---+
    |   |   |   |   | 2
    +-------+-------+
    |010|110|011|111| 1
    |--- ---|--- ---|
    |000|100|001|101| 0
    +-------+-------+

    When doing linear interpolation the megatexture needs to be sampled twice: once for
    the Z slice above the voxel coordinate and once for the slice below. The two slices
    are interpolated with fract(coord.z - 0.5). For example, a Z coordinate of 1.0 is
    halfway between two Z slices so the interpolation factor is 0.5. Below is a side view
    of the 3D voxel grid with voxel coordinates on the left side.

    2 +---+
      |001|
    1 +-z-+
      |000|
    0 +---+

    When doing nearest neighbor the megatexture only needs to be sampled once at the closest Z slice.
*/

Properties getPropertiesFromMegatexture(in SampleData sampleData) {
    vec3 tileUv = clamp(sampleData.tileUv, vec3(0.0), vec3(1.0)); // TODO is the clamp necessary?
    int tileIndex = sampleData.megatextureIndex;
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    ivec3 voxelDimensions = u_dimensions;

    #if defined(PADDING)
        voxelDimensions += u_paddingBefore + u_paddingAfter;
        voxelCoord += vec3(u_paddingBefore);
    #endif

    #if defined(NEAREST_SAMPLING)
        // Round to the center of the nearest voxel
        voxelCoord = floor(voxelCoord) + vec3(0.5); 
    #endif

    #if defined(MEGATEXTURE_2D)
        // Tile location
        vec2 tileUvOffset = index1DTo2DTexcoord(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

        // Slice location
        float slice = voxelCoord.z - 0.5;
        int sliceIndex = int(floor(slice));
        int sliceIndex0 = intClamp(sliceIndex, 0, voxelDimensions.z - 1);
        vec2 sliceUvOffset0 = index1DTo2DTexcoord(sliceIndex0, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);

        // Voxel location
        vec2 voxelUvOffset = clamp(voxelCoord.xy, vec2(0.5), vec2(voxelDimensions.xy) - vec2(0.5)) * u_megatextureVoxelSizeUv;

        // Final location in the megatexture
        vec2 uv0 = tileUvOffset + sliceUvOffset0 + voxelUvOffset;

        #if defined(NEAREST_SAMPLING)
            return getPropertiesFromMegatextureAtUv(uv0);
        #else
            float sliceLerp = fract(slice);
            int sliceIndex1 = intMin(sliceIndex + 1, voxelDimensions.z - 1);
            vec2 sliceUvOffset1 = index1DTo2DTexcoord(sliceIndex1, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);
            vec2 uv1 = tileUvOffset + sliceUvOffset1 + voxelUvOffset;
            Properties properties0 = getPropertiesFromMegatextureAtUv(uv0);
            Properties properties1 = getPropertiesFromMegatextureAtUv(uv1);
            return mixProperties(properties0, properties1, sliceLerp);
        #endif
    #elif defined(MEGATEXTURE_3D)
        // TODO: 3D megatexture has not been implemented yet
        // Tile location
        vec3 tileUvOffset = indexToUv3d(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

        // Voxel location
        vec3 voxelUvOffset = clamp(voxelCoord, vec3(0.5), vec3(voxelDimensions) - vec2(0.5)) * u_megatextureVoxelSizeUv;

        // Final location in the megatexture
        vec3 uv = tileUvOffset + voxelUvOffset;

        return getPropertiesFromMegatextureAtUv(uv);
    #endif
}

// Convert an array of sample datas to a final weighted properties.
Properties accumulatePropertiesFromMegatexture(SampleData sampleDatas[SAMPLE_COUNT]) {
    #if (SAMPLE_COUNT == 1)
        return getPropertiesFromMegatexture(sampleDatas[0]);
    #else
        // When more than one sample is taken the accumulator needs to start at 0
        Properties properties = clearProperties();
        for (int i = 0; i < SAMPLE_COUNT; ++i) {
            float weight = sampleDatas[i].weight;

            // Avoid reading the megatexture when the weight is 0 as it can be costly.
            if (weight > 0.0) {
                Properties tempProperties = getPropertiesFromMegatexture(sampleDatas[i]);
                tempProperties = scaleProperties(tempProperties, weight);
                properties = sumProperties(properties, tempProperties);
            }
        }
        return properties;
    #endif
}

// --------------------------------------------------------
// Tree traversal
// --------------------------------------------------------

OctreeNodeData getOctreeRootData() {
    vec4 rootData = texture2D(u_octreeInternalNodeTexture, vec2(0.0));
    
    OctreeNodeData data;
    data.data = normU8x2_toInt(rootData.xy);
    data.flag = normU8x2_toInt(rootData.zw);
    return data;
}

OctreeNodeData getOctreeChildData(int parentOctreeIndex, ivec3 childCoord) {
    int childIndex = childCoord.z * 4 + childCoord.y * 2 + childCoord.x;
    int octreeCoordX = intMod(parentOctreeIndex, u_octreeInternalNodeTilesPerRow) * 9 + 1 + childIndex;
    int octreeCoordY = parentOctreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    vec4 childData = texture2D(u_octreeInternalNodeTexture, octreeUv);
    
    OctreeNodeData data;
    data.data = normU8x2_toInt(childData.xy);
    data.flag = normU8x2_toInt(childData.zw);
    return data;
}

int getOctreeParentIndex(int octreeIndex) {
    int octreeCoordX = intMod(octreeIndex, u_octreeInternalNodeTilesPerRow) * 9;
    int octreeCoordY = octreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    vec4 parentData = texture2D(u_octreeInternalNodeTexture, octreeUv);
    int parentOctreeIndex = normU8x2_toInt(parentData.xy);
    return parentOctreeIndex;
}

void getOctreeLeafSampleData(in OctreeNodeData data, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    #if (SAMPLE_COUNT == 1)
        sampleDatas[0].megatextureIndex = data.data;
        sampleDatas[0].usingParentMegatextureIndex = data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT;
    #else
        int leafIndex = data.data;
        int leafNodeTexelCount = 2;
        // Adding 0.5 moves to the center of the texel
        float leafCoordXStart = float(intMod(leafIndex, u_octreeLeafNodeTilesPerRow) * leafNodeTexelCount) + 0.5;
        float leafCoordY = float(leafIndex / u_octreeLeafNodeTilesPerRow) + 0.5;

        vec2 leafUv0 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 0.0, leafCoordY);
        vec2 leafUv1 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 1.0, leafCoordY);
        vec4 leafData0 = texture2D(u_octreeLeafNodeTexture, leafUv0);
        vec4 leafData1 = texture2D(u_octreeLeafNodeTexture, leafUv1);

        float lerp = normU8x2_toFloat(leafData0.xy);

        sampleDatas[0].megatextureIndex = normU8x2_toInt(leafData1.xy);
        sampleDatas[1].megatextureIndex = normU8x2_toInt(leafData1.zw);
        sampleDatas[0].usingParentMegatextureIndex = normU8_toInt(leafData0.z) == 1;
        sampleDatas[1].usingParentMegatextureIndex = normU8_toInt(leafData0.w) == 1;
        sampleDatas[0].weight = 1.0 - lerp;
        sampleDatas[1].weight = lerp;
    #endif
}

void traverseOctreeDownwards(inout TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    float sizeAtLevel = 1.0 / pow(2.0, float(traversalData.octreeCoords.w));
    vec3 start = vec3(traversalData.octreeCoords.xyz) * sizeAtLevel;
    vec3 end = start + vec3(sizeAtLevel);

    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        // Find out which octree child contains the position
        // 0 if before center, 1 if after
        vec3 center = 0.5 * (start + end);
        vec3 childCoord = step(center, traversalData.positionUvShapeSpace);

        OctreeNodeData childData = getOctreeChildData(traversalData.parentOctreeIndex, ivec3(childCoord));

        // Get octree coords for the next level down
        ivec4 parentOctreeCoords = traversalData.octreeCoords;
        traversalData.octreeCoords = ivec4(parentOctreeCoords.xyz * 2 + ivec3(childCoord), parentOctreeCoords.w + 1);

        if (childData.flag == OCTREE_FLAG_INTERNAL) {
            // interior tile - keep going deeper
            start = mix(start, center, childCoord);
            end = mix(center, end, childCoord);
            traversalData.parentOctreeIndex = childData.data;
        } else {
            // leaf tile - stop traversing
            float dimAtLevel = pow(2.0, float(traversalData.octreeCoords.w));
            traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
            traversalData.stepT = u_stepSize / dimAtLevel;

            getOctreeLeafSampleData(childData, sampleDatas);
            for (int i = 0; i < SAMPLE_COUNT; i++) {
                if (sampleDatas[i].usingParentMegatextureIndex) {
                    float parentDimAtLevel = pow(2.0, float(parentOctreeCoords.w));
                    sampleDatas[i].tileUv = traversalData.positionUvShapeSpace * parentDimAtLevel - vec3(parentOctreeCoords.xyz);
                } else {
                    sampleDatas[i].tileUv = traversalData.positionUvLocal;
                }
            }
            return;
        }
    }
}

void traverseOctreeFromBeginning(in vec3 positionUv, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    traversalData.octreeCoords = ivec4(0);
    traversalData.parentOctreeIndex = 0;

    // TODO: is it possible for this to be out of bounds, and does it matter?
    traversalData.positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);
    traversalData.positionUvLocal = traversalData.positionUvShapeSpace;

    OctreeNodeData rootData = getOctreeRootData();
    if (rootData.flag == OCTREE_FLAG_LEAF) {
        // No child data, only the root tile has data
        getOctreeLeafSampleData(rootData, sampleDatas);
        traversalData.stepT = u_stepSize;
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            sampleDatas[i].tileUv = traversalData.positionUvLocal;
        }
    }
    else
    {
        traverseOctreeDownwards(traversalData, sampleDatas);
    }
}

void traverseOctreeFromExisting(in vec3 positionUv, inout TraversalData traversalData, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    float dimAtLevel = pow(2.0, float(traversalData.octreeCoords.w));
    traversalData.positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);    
    traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
    
    // Note: This code assumes the position is always inside the root tile.
    bool insideTile = traversalData.octreeCoords.w == 0 || inRange(traversalData.positionUvLocal, vec3(0.0), vec3(1.0)); 

    if (insideTile) {
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            if (sampleDatas[i].usingParentMegatextureIndex) {
                ivec4 parentOctreeCoords;
                parentOctreeCoords.xyz = traversalData.octreeCoords.xyz / ivec3(2);
                parentOctreeCoords.w = traversalData.octreeCoords.w - 1;
                float parentDimAtLevel = pow(2.0, float(parentOctreeCoords.w));
                sampleDatas[i].tileUv = traversalData.positionUvShapeSpace * parentDimAtLevel - vec3(parentOctreeCoords.xyz);
            } else {
                sampleDatas[i].tileUv = traversalData.positionUvLocal;
            }
        }
    } else {
        // Go up tree
        for (int i = 0; i < OCTREE_MAX_LEVELS; ++i)
        {
            traversalData.octreeCoords.xyz /= ivec3(2);
            traversalData.octreeCoords.w -= 1;
            dimAtLevel *= 0.5;

            traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
            insideTile = traversalData.octreeCoords.w == 0 || inRange(traversalData.positionUvLocal, vec3(0.0), vec3(1.0));
            
            if (!insideTile) {
                traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);
            } else {
                break;
            }
        }

        // Go down tree
        traverseOctreeDownwards(traversalData, sampleDatas);
    }
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;

    Intersections ix;
    vec2 entryExitT = intersectScene(screenCoord, viewPosUv, viewDirUv, ix);

    // Exit early if the scene was completely missed.
    if (entryExitT.x == NO_HIT) {
        discard;
    }

    float currT = entryExitT.x;
    float endT = entryExitT.y;
    vec3 positionUv = viewPosUv + currT * viewDirUv;

    // Traverse the tree from the start position
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(positionUv, traversalData, sampleDatas);

    #if defined(JITTER)
        float noise = hash(screenCoord); // [0,1]
        currT += noise * traversalData.stepT;
        positionUv += noise * traversalData.stepT * viewDirUv;
    #endif

    FragmentInput fragmentInput;
    #if defined(STATISTICS)
        setStatistics(fragmentInput.metadata.statistics);
    #endif

    vec4 colorAccum = vec4(0.0);

    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; ++stepCount) {
        // Read properties from the megatexture based on the traversal state
        Properties properties = accumulatePropertiesFromMegatexture(sampleDatas);
        
        // Prepare the custom shader inputs
        copyPropertiesToMetadata(properties, fragmentInput.metadata);
        fragmentInput.voxel.positionUv = positionUv;
        fragmentInput.voxel.positionShapeUv = traversalData.positionUvShapeSpace;
        fragmentInput.voxel.positionUvLocal = traversalData.positionUvLocal;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.travelDistance = traversalData.stepT;

        // Run the custom shader
        czm_modelMaterial materialOutput;
        fragmentMain(fragmentInput, materialOutput);

        // Sanitize the custom shader output
        vec4 color = vec4(materialOutput.diffuse, materialOutput.alpha);
        color.rgb = max(color.rgb, vec3(0.0));
        color.a = clamp(color.a, 0.0, 1.0);

        // Pre-multiplied alpha blend
        colorAccum += (1.0 - colorAccum.a) * vec4(color.rgb * color.a, color.a);

        // Stop traversing if the alpha has been fully saturated
        if (colorAccum.a > ALPHA_ACCUM_MAX) {
            colorAccum.a = ALPHA_ACCUM_MAX;
            break;
        }

        // Keep raymarching
        currT += traversalData.stepT;
        positionUv += traversalData.stepT * viewDirUv;

        // Check if there's more intersections.
        if (currT > endT) {
            #if (INTERSECTION_COUNT == 1)
                break;
            #else
                vec2 entryExitT = nextIntersection(ix);
                if (entryExitT.x == NO_HIT) {
                    break;
                } else {
                    // Found another intersection. Keep raymarching.
                    currT += entryExitT.x;
                    endT += entryExitT.y;
                    positionUv += entryExitT.x * viewDirUv;
                }
            #endif
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctree but is faster when the ray is in the same tile as the previous step.
        traverseOctreeFromExisting(positionUv, traversalData, sampleDatas);
    }

    // Convert the alpha from [0,ALPHA_ACCUM_MAX] to [0,1]
    colorAccum.a /= ALPHA_ACCUM_MAX;

    #if defined(PICKING)
        // If alpha is 0.0 there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        gl_FragColor = u_pickColor;
    #else
        gl_FragColor = colorAccum;
    #endif
}
