/*
Don't delete this comment!
Some shader code is dynamically generated in VoxelPrimitive.js to support custom shaders with arbitrary metadata.
Below is an example of how this code might look. Properties like "temperature" and "direction" are just examples.

// Defines
#define PROPERTY_COUNT ###
#define SAMPLE_COUNT ###
#define SHAPE_BOX
#define SHAPE_ELLIPSOID
#define SHAPE_CYLINDER
#define MEGATEXTURE_2D
#define MEGATEXTURE_3D
#define DEPTH_TEST
#define JITTER
#define NEAREST_SAMPLING
#define DESPECKLE
#define STATISTICS
#define PADDING
#define BOUNDS
#define CLIPPING_BOUNDS
#define PICKING

// Uniforms
uniform sampler2D u_megatextureTextures[PROPERTY_COUNT];

// Structs
struct PropertyStatistics_temperature {
    float min;
    float max;
};
struct PropertyStatistics_direction {
    vec3 min;
    vec3 max;
};
struct Statistics {
    PropertyStatistics_temperature temperature;
    PropertyStatistics_direction direction;
};
struct Metadata {
    Statistics statistics;
    float temperature;
    vec3 direction;
};
struct VoxelProperty_temperature {
    vec3 partialDerivativeLocal;
    vec3 partialDerivativeWorld;
    vec3 partialDerivativeView;
    bool partialDerivativeValid;
};
struct VoxelProperty_direction {
    mat3 partialDerivativeLocal;
    mat3 partialDerivativeWorld;
    mat3 partialDerivativeView;
    bool partialDerivativeValid;
};
struct Voxel {
    VoxelProperty_temperature temperature;
    VoxelProperty_direction direction;
    vec3 positionEC;
    vec3 positionUv;
    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
    vec3 viewDirUv;
    vec3 viewDirWorld;
    float travelDistance;
};
struct FragmentInput {
    Metadata metadata;
    Voxel voxel;
};
struct Properties {
    // This struct is similar to Metadata but is not part of the custom shader API and
    // is intended to be used internally as a lightweight way to pass around properties.
    float temperature;
    vec3 direction;
};

// Functions
Properties clearProperties() {
    Properties properties;
    properties.temperature = 0.0;
    properties.direction = vec3(0.0);
    return properties;
}
Properties sumProperties(Properties propertiesA, Properties propertiesB) {
    Properties properties;
    properties.temperature = propertiesA.temperature + propertiesB.temperature;
    properties.direction = propertiesA.direction + propertiesB.direction;
    return properties;
}
Properties mixProperties(Properties propertiesA, Properties propertiesB, float mixFactor) {
    Properties properties;
    properties.temperature = mix(propertiesA.temperature, propertiesB.temperature, mixFactor);
    properties.direction = mix(propertiesA.direction, propertiesB.direction, mixFactor);
    return properties;
}
void copyPropertiesToMetadata(in Properties properties, inout Metadata metadata) {
    metadata.temperature = properties.temperature;
    metadata.direction = properties.direction;
}
void setStatistics(inout Statistics statistics) {
    // Assume the "direction" property has no min/max 
    statistics.temperature.min = 20.0;
    statistics.temperature.max = 50.0;
}
Properties getPropertiesFrom2DMegatextureAtUv(vec2 texcoord) {
    Properties properties;
    properties.temperature = texture2D(u_megatextureTextures[0], texcoord).r;
    properties.direction = texture2D(u_megatextureTextures[1], texcoord).rgb;
    return properties;
}
Properties getPropertiesFrom3DMegatextureAtUv(vec3 texcoord) {
    Properties properties;
    properties.temperature = texture3D(u_megatextureTextures[0], texcoord).r;
    properties.direction = texture3D(u_megatextureTextures[1], texcoord).rgb;
    return properties;
}
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    vec3 direction = fsInput.metadata.direction;
    float temperature = fsInput.metadata.temperature;
    float minTemperature = fsInput.metadata.statistics.temperature.min;
    float maxTemperature = fsInput.metadata.statistics.temperature.max;
    
    material.diffuse = abs(direction);
    material.alpha = (temperature - minTemperature) / (maxTemperature - minTemperature);
}
*/

// These octree flags must be in sync with GpuOctreeFlag in VoxelTraversal.js
#define OCTREE_FLAG_INTERNAL 0
#define OCTREE_FLAG_LEAF 1
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2

#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops
#define OCTREE_MAX_LEVELS 32 // Harcoded value because GLSL doesn't like variable length loops
#define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0

#define NO_HIT (-czm_infinity)
#define INF_HIT (czm_infinity * 0.5)
#define POSITIVE_ENTRY 0.0
#define POSITIVE_EXIT 1.0
#define NEGATIVE_ENTRY 2.0
#define NEGATIVE_EXIT 3.0

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

struct SampleData {
    int megatextureIndex;
    int levelsAbove;
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

#if defined(CLIPPING_BOUNDS)
    uniform vec3 u_minClippingBounds;
    uniform vec3 u_maxClippingBounds;
#endif

#if defined(SHAPE_BOX)
    #define BOX_INTERSECTION_COUNT 1
    uniform vec2 u_boxMinBounds;
    uniform vec2 u_boxMaxBounds;
#endif

#if defined(SHAPE_ELLIPSOID)
    /* Ellipsoid defines:
    #define ELLIPSOID_WEDGE_REGULAR ### // when there's a wedge 
    #define ELLIPSOID_WEDGE_FLIPPED ### // when the wedge has two intersection intervals
    #define ELLIPSOID_CONE_BOTTOM_REGULAR ### // when there's a bottom cone
    #define ELLIPSOID_CONE_BOTTOM_FLIPPED ### // when cone shape has two intersection intervals
    #define ELLIPSOID_CONE_TOP_REGULAR ### // when there's a top cone
    #define ELLIPSOID_CONE_TOP_FLIPPED ### // when cone shape has two intersection intervals
    #define ELLIPSOID_INNER ### // when there's an inner ellipsoid
    #define ELLIPSOID_OUTER ### // outer ellipsoid - always defined
    #define ELLIPSOID_INTERSECTION_COUNT ### // the total number of enter and exit points for all the constituent intersections
    */

    // Ellipsoid uniforms
    uniform vec4 u_ellipsoidRectangle; // west [-pi,+pi], south [-halfPi,+halfPi], east [-pi,+pi], north [-halfPi,+halfPi]. 
    uniform vec3 u_ellipsoidRadiiUv; // [0,1]
    uniform vec3 u_ellipsoidInverseRadiiSquaredUv;

    #if defined(ELLIPSOID_WEDGE_REGULAR) || defined(ELLIPSOID_WEDGE_FLIPPED)
        uniform float u_ellipsoidWestUv;
        uniform float u_ellipsoidInverseLongitudeRangeUv;
    #endif
    #if defined(ELLIPSOID_CONE_BOT_REGULAR) || defined(ELLIPSOID_CONE_BOT_FLIPPED) || defined(ELLIPSOID_CONE_TOP_REGULAR) || defined(ELLIPSOID_CONE_TOP_FLIPPED)
        uniform float u_ellipsoidSouthUv; 
        uniform float u_ellipsoidInverseLatitudeRangeUv;
    #endif
    #if defined(ELLIPSOID_INNER)
        uniform float u_ellipsoidInverseHeightDifferenceUv;
        uniform float u_ellipsoidInverseInnerScaleUv;
        uniform vec3 u_ellipsoidInnerRadiiUv; // [0,1]
    #endif
#endif

#if defined(SHAPE_CYLINDER)
    /* Cylinder defines:
    #define CYLINDER_INNER ### // when there's an inner cylinder
    #define CYLINDER_WEDGE_REGULAR ### // when there's a wedge
    #define CYLINDER_WEDGE_FLIPPED ### // when the wedge has two intersection intervals
    #define CYLINDER_INTERSECTION_COUNT ### // the total number of enter and exit points for all the constituent intersections
    */

    #if defined(CYLINDER_INNER)
        uniform float u_something;    
    #endif
    #if defined(CYLINDER_WEDGE_REGULAR) || defined(CYLINDER_WEDGE_FLIPPED)
        uniform float u_cylinderMinAngle;
        uniform float u_cylinderInverseAngleRange;
    #endif
#endif

// Determine how many intersections there are going to be
#if defined(SHAPE_BOX)
    #define SHAPE_INTERSECTION_COUNT BOX_INTERSECTION_COUNT 
#elif defined(SHAPE_ELLIPSOID)
    #define SHAPE_INTERSECTION_COUNT ELLIPSOID_INTERSECTION_COUNT
#elif defined(SHAPE_CYLINDER)
    #define SHAPE_INTERSECTION_COUNT CYLINDER_INTERSECTION_COUNT
#endif

#if defined(DEPTH_TEST)
    #define DEPTH_INTERSECTION_IDX (SHAPE_INTERSECTION_COUNT * 2)
    #define SCENE_INTERSECTION_COUNT (SHAPE_INTERSECTION_COUNT + 1)
#else
    #define SCENE_INTERSECTION_COUNT SHAPE_INTERSECTION_COUNT
#endif

struct Intersections {
    vec2 intersections[SCENE_INTERSECTION_COUNT * 2];
    int index;
};

struct Ray {
    vec3 pos;
    vec3 dir;
};

// --------------------------------------------------------
// Misc math
// --------------------------------------------------------

#if defined(JITTER)
#define HASHSCALE 50.0
float hash(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * HASHSCALE);
	p3 += dot(p3, p3.yzx + 19.19);
	return fract((p3.x + p3.y) * p3.z);
}
#endif
float signNoZero(float v) {
    return (v < 0.0) ? -1.0 : 1.0;
}
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
float safeMod(float a, float m) {
    return mod(mod(a, m) + m, m);
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
// Unit cube from [-1, +1]
vec2 intersectUnitCube(Ray ray)
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

#if defined(SHAPE_BOX)
vec2 intersectBoxShape(Ray ray, out Intersections ix)
{
    #if defined(BOX_BOUNDED)
        vec3 pos = 0.5 * (u_minBounds + u_maxBounds);
        vec3 scale = 0.5 * (u_maxBounds - u_minBounds);
        
        if (any(equal(scale, vec3(0.0)))) {
            // Transform the ray into unit space on Z plane
            Ray flatRay;
            if (scale.x == 0.0) {
                flatRay = Ray(
                    (ray.pos.yzx - pos.yzx) / vec3(scale.yz, 1.0),
                    ray.dir.yzx / vec3(scale.yz, 1.0)
                );
            } else if (scale.y == 0.0) {
                flatRay = Ray(
                    (ray.pos.xzy - pos.xzy) / vec3(scale.xz, 1.0),
                    ray.dir.xzy / vec3(scale.xz, 1.0)
                );
            } else if (scale.z == 0.0) {
                flatRay = Ray(
                    (ray.pos.xyz - pos.xyz) / vec3(scale.xy, 1.0),
                    ray.dir.xyz / vec3(scale.xy, 1.0)
                );
            }
            return intersectUnitSquare(flatRay);
        } else {
            // Transform the ray into "unit space"
            Ray unitRay = Ray((ray.pos - pos) / scale, ray.dir / scale);
            return intersectUnitCube(unitRay);
        }
    #endif

            return intersectUnitCube(ray);

}
#endif

#if (defined(SHAPE_ELLIPSOID) && defined(ELLIPSOID_WEDGE_REGULAR)) || (defined(SHAPE_CYLINDER) && defined(CYLINDER_WEDGE_REGULAR))
vec2 intersectWedge(Ray ray, float minAngle, float maxAngle)
{    
    vec2 o = ray.pos.xy;
    vec2 d = ray.dir.xy;
    vec2 n1 = vec2(sin(minAngle), -cos(minAngle));
    vec2 n2 = vec2(-sin(maxAngle), cos(maxAngle));
    
    float a1 = dot(o, n1);
    float a2 = dot(o, n2);
    float b1 = dot(d, n1);
    float b2 = dot(d, n2);
    
    float t1 = -a1 / b1;
    float t2 = -a2 / b2;
    float s1 = sign(a1);
    float s2 = sign(a2);

    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    float smin = tmin == t1 ? s1 : s2;
    float smax = tmin == t1 ? s2 : s1;    

    bool e = tmin >= 0.0;
    bool f = tmax >= 0.0;
    bool g = smin >= 0.0;
    bool h = smax >= 0.0;
    
    if (e != g && f == h) return vec2(tmin, tmax);
    else if (e == g && f == h) return vec2(-INF_HIT, tmin);
    else if (e != g && f != h) return vec2(tmax, +INF_HIT);
    else return vec2(NO_HIT);
}
#endif

#if (defined(SHAPE_ELLIPSOID) && defined(ELLIPSOID_WEDGE_FLIPPED)) || (defined(SHAPE_CYLINDER) && defined(CYLINDER_WEDGE_FLIPPED))
vec2 intersectHalfSpace(Ray ray, float angle)
{    
    vec2 o = ray.pos.xy;
    vec2 d = ray.dir.xy;
    vec2 n = vec2(sin(angle), -cos(angle));
    
    float a = dot(o, n);
    float b = dot(d, n);
    float t = -a / b;
    float s = sign(a);

    if (t >= 0.0 != s >= 0.0) return vec2(t, +INF_HIT);
    else return vec2(-INF_HIT, t);
}
#endif

#if defined(SHAPE_ELLIPSOID)
vec2 intersectUnitSphere(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float b = dot(d, o);
    float c = dot(o, o) - 1.0;
    float det = b * b - c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float t1 = -b - det;
    float t2 = -b + det;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    
    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID)
vec2 intersectUnitSphereUnnormalizedDirection(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d, d);
    float b = dot(d, o);
    float c = dot(o, o) - 1.0;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    
    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID) && (defined(ELLIPSOID_CONE_BOTTOM_REGULAR) || defined(ELLIPSOID_CONE_BOTTOM_FLIPPED) || defined(ELLIPSOID_CONE_TOP_REGULAR) || defined(ELLIPSOID_CONE_TOP_FLIPPED))
vec2 intersectDoubleEndedCone(Ray ray, float latitude)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float h = cos(czm_piOverTwo - abs(latitude));
    float hh = h * h;
    float a = d.z * d.z - dot(d, d) * hh;
    float b = d.z * o.z - dot(o, d) * hh;
    float c = o.z * o.z - dot(o, o) * hh;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID) && (defined(ELLIPSOID_CONE_BOTTOM_FLIPPED) || defined(ELLIPSOID_CONE_TOP_FLIPPED))
vec4 intersectFlippedCone(Ray ray, float latitude) {
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    vec2 ix = intersectDoubleEndedCone(ray, latitude);

    if (ix.x == NO_HIT) {
        return vec4(NO_HIT);
    }

    float tmin = ix.x;
    float tmax = ix.y;
    float h1 = o.z + tmin * d.z;
    float h2 = o.z + tmax * d.z;

    // One interval
    if (h1 < 0.0 && h2 < 0.0) return vec4(-INF_HIT, +INF_HIT, NO_HIT, NO_HIT);
    else if (h1 < 0.0) return vec4(-INF_HIT, tmax, NO_HIT, NO_HIT);
    else if (h2 < 0.0) return vec4(tmin, +INF_HIT, NO_HIT, NO_HIT);
    else if (tmin < 0.0) return vec4(tmax, +INF_HIT, NO_HIT, NO_HIT);
    // Two intervals
    else return vec4(-INF_HIT, tmin, tmax, +INF_HIT);
}
#endif

#if defined(SHAPE_ELLIPSOID) && (defined(ELLIPSOID_CONE_BOTTOM_REGULAR) || defined(ELLIPSOID_CONE_TOP_REGULAR))
vec2 intersectRegularCone(Ray ray, float latitude) {
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    vec2 ix = intersectDoubleEndedCone(ray, latitude);

    if (ix.x == NO_HIT) {
        return vec2(NO_HIT);
    }

    float tmin = ix.x;
    float tmax = ix.y;
    float h1 = o.z + tmin * d.z;
    float h2 = o.z + tmax * d.z;

    if (h1 < 0.0 && h2 < 0.0) return vec2(NO_HIT);
    else if (h1 < 0.0) return vec2(tmax, +INF_HIT);
    else if (h2 < 0.0) return vec2(-INF_HIT, tmin);
    else return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID)
void intersectEllipsoidShape(in Ray ray, inout Intersections ix)
{
    // Outer ellipsoid
    vec2 outerIntersect = intersectUnitSphereUnnormalizedDirection(ray);
    ix.intersections[ELLIPSOID_OUTER + 0] = vec2(outerIntersect.x, POSITIVE_ENTRY);
    ix.intersections[ELLIPSOID_OUTER + 1] = vec2(outerIntersect.y, POSITIVE_EXIT);

    // Exit early if the outer ellipsoid was missed.
    if (outerIntersect.x == NO_HIT) {
        return;
    }

    // Inner ellipsoid
    #if defined(ELLIPSOID_INNER)
        Ray innerRay = Ray(ray.pos * u_ellipsoidInverseInnerScaleUv, ray.dir * u_ellipsoidInverseInnerScaleUv);
        vec2 innerIntersect = intersectUnitSphereUnnormalizedDirection(innerRay);
        ix.intersections[ELLIPSOID_INNER + 0] = vec2(innerIntersect.x, NEGATIVE_ENTRY);
        ix.intersections[ELLIPSOID_INNER + 1] = vec2(innerIntersect.y, NEGATIVE_EXIT);
    #endif
        
    // Bottom cone
    #if defined(ELLIPSOID_CONE_BOT_REGULAR) || defined(ELLIPSOID_CONE_BOT_FLIPPED)
        // Flip the inputs because the intersection function expects a cone growing towards +Z.
        float flippedSouth = -u_ellipsoidRectangle.y;
        Ray flippedRay = ray;
        flippedRay.dir.z *= -1.0;
        flippedRay.pos.z *= -1.0;
        
        #if defined(ELLIPSOID_CONE_BOT_REGULAR)
            vec2 botConeIx = intersectRegularCone(flippedRay, flippedSouth);
            ix.intersections[ELLIPSOID_CONE_BOT_REGULAR + 0] = vec2(botConeIx.x, -1.0);
            ix.intersections[ELLIPSOID_CONE_BOT_REGULAR + 1] = vec2(botConeIx.y, -1.0);
        #elif defined(ELLIPSOID_CONE_BOT_FLIPPED)
            vec4 botConeIx = intersectFlippedCone(flippedRay, flippedSouth);
            ix.intersections[ELLIPSOID_CONE_BOT_FLIPPED + 0] = vec2(botConeIx.x, -1.0);
            ix.intersections[ELLIPSOID_CONE_BOT_FLIPPED + 1] = vec2(botConeIx.y, -1.0);
            ix.intersections[ELLIPSOID_CONE_BOT_FLIPPED + 2] = vec2(botConeIx.z, -1.0);
            ix.intersections[ELLIPSOID_CONE_BOT_FLIPPED + 3] = vec2(botConeIx.w, -1.0);
        #endif
    #endif

    // Top cone        
    #if defined(ELLIPSOID_CONE_TOP_REGULAR) || defined(ELLIPSOID_CONE_TOP_FLIPPED)
        float north = u_ellipsoidRectangle.w;
        #if defined(ELLIPSOID_CONE_TOP_REGULAR)
            vec2 topConeIntersect = intersectRegularCone(ray, north);
            ix.intersections[ELLIPSOID_CONE_TOP_REGULAR + 0] = vec2(topConeIntersect.x, -1.0);
            ix.intersections[ELLIPSOID_CONE_TOP_REGULAR + 1] = vec2(topConeIntersect.y, -1.0);
        #elif defined(ELLIPSOID_CONE_TOP_FLIPPED)
            vec4 topConeIntersect = intersectFlippedCone(ray, north);
            ix.intersections[ELLIPSOID_CONE_TOP_FLIPPED + 0] = vec2(topConeIntersect.x, -1.0);
            ix.intersections[ELLIPSOID_CONE_TOP_FLIPPED + 1] = vec2(topConeIntersect.y, -1.0);
            ix.intersections[ELLIPSOID_CONE_TOP_FLIPPED + 2] = vec2(topConeIntersect.z, -1.0);
            ix.intersections[ELLIPSOID_CONE_TOP_FLIPPED + 3] = vec2(topConeIntersect.w, -1.0);
        #endif
    #endif

    // Wedge
    #if defined(ELLIPSOID_WEDGE_REGULAR) || defined(ELLIPSOID_WEDGE_FLIPPED)
        float west = u_ellipsoidRectangle.x; // [-pi,+pi]
        float east = u_ellipsoidRectangle.z; // [-pi,+pi]
        #if defined(ELLIPSOID_WEDGE_REGULAR)
            vec2 wedgeIntersect = intersectWedge(ray, west, east);
            ix.intersections[ELLIPSOID_WEDGE_REGULAR + 0] = vec2(wedgeIntersect.x, -1.0);
            ix.intersections[ELLIPSOID_WEDGE_REGULAR + 1] = vec2(wedgeIntersect.y, -1.0);
        #elif defined(ELLIPSOID_WEDGE_FLIPPED)
            vec2 planeIntersectWest = intersectHalfSpace(ray, west);
            vec2 planeIntersectEast = intersectHalfSpace(ray, east);
            ix.intersections[ELLIPSOID_WEDGE_FLIPPED + 0] = vec2(planeIntersectWest.x, -1.0);
            ix.intersections[ELLIPSOID_WEDGE_FLIPPED + 1] = vec2(planeIntersectWest.y, -1.0);
            ix.intersections[ELLIPSOID_WEDGE_FLIPPED + 2] = vec2(planeIntersectEast.x, -1.0);
            ix.intersections[ELLIPSOID_WEDGE_FLIPPED + 3] = vec2(planeIntersectEast.y, -1.0);
        #endif
    #endif
}
#endif

#if defined(SHAPE_CYLINDER)
vec2 intersectUnitCylinder(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d.xy, d.xy);
    float b = dot(o.xy, d.xy);
    float c = dot(o.xy, o.xy) - 1.0;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float ta = (-b - det) / a;
    float tb = (-b + det) / a;
    float t1 = min(ta, tb);
    float t2 = max(ta, tb);
    
    float z1 = o.z + t1 * d.z;
    float z2 = o.z + t2 * d.z;
    
    if (abs(z1) >= 1.0)
    {
        float tCap = (sign(z1) - o.z) / d.z;
        t1 = abs(b + a * tCap) < det ? tCap : NO_HIT;
    }
    
    if (abs(z2) >= 1.0)
    {
        float tCap = (sign(z2) - o.z) / d.z;
        t2 = abs(b + a * tCap) < det ? tCap : NO_HIT;
    }
    
    return vec2(t1, t2);
}
#endif

#if defined(SHAPE_CYLINDER)
vec2 intersectUnitCircle(Ray ray) {
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float t = -o.z / d.z;
    vec2 zPlanePos = o.xy + d.xy * t;
    float distSqr = dot(zPlanePos, zPlanePos);

    if (distSqr > 1.0) {
        return vec2(NO_HIT);
    }
    
    return vec2(t, t);
}
#endif

#if defined(SHAPE_CYLINDER) && defined(BOUNDS_0_MIN)
vec2 intersectInfiniteUnitCylinder(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d.xy, d.xy);
    float b = dot(o.xy, d.xy);
    float c = dot(o.xy, o.xy) - 1.0;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);

    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_CYLINDER)
void intersectCylinderShape(Ray ray, inout Intersections ix)
{
    #if !defined(BOUNDS)
        return intersectUnitCylinder(ray);
    #else
        float minRadius = u_minBounds.x; // [0,1]
        float maxRadius = u_maxBounds.x; // [0,1]
        float minHeight = u_minBounds.y; // [-1,+1]
        float maxHeight = u_maxBounds.y; // [-1,+1]
        float minAngle = u_minBounds.z; // [-pi,+pi]
        float maxAngle = u_maxBounds.z; // [-pi,+pi]

        float posZ = 0.5 * (minHeight + maxHeight);
        vec3 pos = vec3(0.0, 0.0, posZ);
        float scaleZ = 0.5 * (maxHeight - minHeight);
        
        vec2 outerIntersect;

        // TODO: use define instead of branch
        if (scaleZ == 0.0) {
            vec3 outerScale = vec3(maxRadius, maxRadius, 1.0);
            Ray outerRay = Ray((ray.pos - pos) / outerScale, ray.dir / outerScale);    
            outerIntersect = intersectUnitCircle(outerRay);
        } else {
            vec3 outerScale = vec3(maxRadius, maxRadius, scaleZ);
            Ray outerRay = Ray((ray.pos - pos) / outerScale, ray.dir / outerScale);    
            outerIntersect = intersectUnitCylinder(outerRay);
        }

        if (outerIntersect.x == NO_HIT) {
            return;
        }

        ix.intersections[0] = vec2(outerIntersect.x, float(0));
        ix.intersections[1] = vec2(outerIntersect.y, float(1));
        
        #if defined(BOUNDS_0_MIN)
            vec3 innerScale = vec3(minRadius, minRadius, 1.0);
            Ray innerRay = Ray((ray.pos - pos) / innerScale, ray.dir / innerScale);
            vec2 innerIntersect = intersectInfiniteUnitCylinder(innerRay);

            // TODO: use define instead of branch
            if (minRadius != maxRadius) {
                intersections[2] = vec2(float(2), innerIntersect.x);
                intersections[3] = vec2(float(3), innerIntersect.y);
            } else {            
                // When the cylinder is perfectly thin it's necessary to sandwich the
                // inner cylinder intersection inside the outer cylinder intersection.
                
                // Without this special case,
                // [outerMin, outerMax, innerMin, innerMax] will bubble sort to
                // [outerMin, innerMin, outerMax, innerMax] which will cause the back
                // side of the cylinder to be invisible because it will think the ray
                // is still inside the inner (negative) cylinder after exiting the
                // outer (positive) cylinder. 

                // With this special case,
                // [outerMin, innerMin, innerMax, outerMax] will bubble sort to
                // [outerMin, innerMin, innerMax, outerMax] which will work correctly.

                // Note: If sortIntersections() changes its sorting function
                // from bubble sort to something else, this code may need to change.

                intersections[0] = vec2(float(0), outerIntersect.x);
                intersections[1] = vec2(float(2), innerIntersect.x);
                intersections[2] = vec2(float(3), innerIntersect.y);
                intersections[3] = vec2(float(1), outerIntersect.y);        
            }
        #endif

        #if defined(BOUNDS_2_MIN) || defined(BOUNDS_2_MAX)
            vec2 wedgeIntersect = intersectWedge(ray, minAngle, maxAngle);
            intersections[BOUNDS_2_MIN_MAX_IDX * 2 + 0] = vec2(float(BOUNDS_2_MIN_MAX_IDX * 2 + 0), wedgeIntersect.x);
            intersections[BOUNDS_2_MIN_MAX_IDX * 2 + 1] = vec2(float(BOUNDS_2_MIN_MAX_IDX * 2 + 1), wedgeIntersect.y);
        #endif        
    #endif
}
#endif

void sortIntersections(inout Intersections ix) {
    // Sort the intersections from min T to max T with bubble sort.
    // Note: If this sorting function changes, some of the intersection test may
    // need to be updated. Search for "bubble sort" to find those areas.
    const int passes = SCENE_INTERSECTION_COUNT * 2 - 1;
    for (int n = passes; n > 0; --n) {
        for (int i = 0; i < passes; ++i) {
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
}

vec2 nextIntersection(inout Intersections ix) {
    vec2 entryExitT = vec2(NO_HIT);
    
    #if (SCENE_INTERSECTION_COUNT == 1)
        if (ix.index == 0) {
            entryExitT.x = ix.intersections[0].x;
            entryExitT.y = ix.intersections[1].x;
            ix.index += 1;
        }
    #else
        int surroundCount = 0;
        bool surroundIsPositive = false;
        const int passCount = SCENE_INTERSECTION_COUNT * 2;
        for (int i = 0; i < passCount; i++)
        {
            vec2 intersect = ix.intersections[i];
            float t = intersect.x;
            bool currShapeIsPositive = intersect.y < 2.0;
            bool enter = mod(intersect.y, 2.0) == 0.0;

            surroundCount += enter ? +1 : -1;
            surroundIsPositive = currShapeIsPositive ? enter : surroundIsPositive;
            
            // The loop should be: for (i = ix.index; i < passCount; ++i) {...} but WebGL1 cannot
            // loop with non-constant condition, so it has to continue instead.
            if (i < ix.index) {
                continue;
            }

            // entering positive or exiting negative
            if (surroundCount == 1 && surroundIsPositive && enter == currShapeIsPositive) {
                entryExitT.x = t;
            }
            
            // exiting positive or entering negative after being inside positive
            // TODO: Can this be simplified?
            bool exitPositive = !enter && currShapeIsPositive && surroundCount == 0;
            bool enterNegativeFromPositive = enter && !currShapeIsPositive && surroundCount == 2 && surroundIsPositive;
            if (exitPositive || enterNegativeFromPositive) {
                entryExitT.y = t;

                // entry and exit have been found, so the loop can stop
                if (exitPositive) {
                    ix.index = SCENE_INTERSECTION_COUNT * 2;
                } else {
                    ix.index = i + 1;
                }
                break;
            }
        }
    #endif

    return entryExitT;
}

#if defined(DEPTH_TEST)
float intersectDepth(vec2 fragCoord, vec2 screenUv, vec3 positionUv, vec3 directionUv) {
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, screenUv));
    if (logDepthOrDepth != 0.0) {
        // Calculate how far the ray must travel before it hits the depth buffer.
        vec4 eyeCoordinateDepth = czm_windowToEyeCoordinates(fragCoord, logDepthOrDepth);
        eyeCoordinateDepth /= eyeCoordinateDepth.w;
        vec3 depthPositionUv = vec3(u_transformPositionViewToUv * eyeCoordinateDepth);
        return dot(directionUv, depthPositionUv - positionUv);
    } else {
        // There's no depth at this position so set it to some really far value.
        return czm_infinity;
    }
}
#endif

vec2 intersectScene(vec2 fragCoord, vec2 screenUv, vec3 positionUv, vec3 directionUv, out Intersections ix) {
    // Do a ray-shape intersection to find the exact starting and ending points.
    // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
    // Direction is scaled as well to be in sync with position. 
    Ray ray = Ray(positionUv * 2.0 - 1.0, directionUv * 2.0);

    #if defined(SHAPE_BOX)
        intersectBoxShape(ray, ix);
    #elif defined(SHAPE_ELLIPSOID)
        intersectEllipsoidShape(ray, ix);
    #elif defined(SHAPE_CYLINDER)
        intersectCylinderShape(ray, ix);f
    #endif

    // Exit early if the shape was completely missed
    if (ix.intersections[0].x == NO_HIT) {
        return vec2(NO_HIT);
    }

    #if defined(DEPTH_TEST)
        float depthT = intersectDepth(fragCoord, screenUv, positionUv, directionUv);
        ix.intersections[DEPTH_INTERSECTION_IDX + 0] = vec2(depthT, NEGATIVE_ENTRY);
        ix.intersections[DEPTH_INTERSECTION_IDX + 1] = vec2(+INF_HIT, NEGATIVE_EXIT);
    #endif

    sortIntersections(ix);

    // Find the first intersection interval
    ix.index = 0;
    vec2 entryExitT = nextIntersection(ix);

    // Intersection is invalid when start and end are behind the ray.
    if (entryExitT.x < 0.0 && entryExitT.y < 0.0) {
        return vec2(NO_HIT);
    }
    
    // Set start to 0 when ray is inside the shape.
    entryExitT.x = max(entryExitT.x, 0.0);

    return entryExitT;
}

#if defined(SHAPE_BOX)
vec3 transformFromUvToBoxSpace(in vec3 positionUv) {
    vec3 positionShape = positionUv;
    #if defined(BOUNDS)
        positionShape = (positionShape - u_minBoundsUv) * u_inverseBoundsUv; // [0,1]
    #endif
    return positionShape;
}
#endif

#if defined(SHAPE_ELLIPSOID)
// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse
// Pro: Good when radii.x ~= radii.y
// Con: Breaks at pos.x ~= 0.0, especially inside the ellipse
// Con: Inaccurate with exterior points and thin ellipses
float ellipseDistanceIterative (vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 invRadii = 1.0 / radii;
    vec2 a = vec2(1.0, -1.0) * (radii.x * radii.x - radii.y * radii.y) * invRadii;
    vec2 t = vec2(0.70710678118); // sqrt(2) / 2
    vec2 v = radii * t;

    const int iterations = 3;
    for (int i = 0; i < iterations; i++) {
        vec2 e = a * pow(t, vec2(3.0));
        vec2 q = normalize(p - e) * length(v - e);
        t = normalize((q + e) * invRadii);
        v = radii * t;
    }
    return length(v * sign(pos) - pos) * sign(p.y - v.y);
}
#endif

#if defined(SHAPE_ELLIPSOID)
// From: https://www.shadertoy.com/view/4sS3zz
// Pro: Accurate in most cases
// Con: Breaks if radii.x ~= radii.y
float ellipseDistanceAnalytical(vec2 pos, vec2 radii) {
    vec2 p = pos;
    vec2 ab = radii;

	p = abs(p); 
    if (p.x > p.y) {
        p = p.yx;
        ab = ab.yx;
    }
	
	float l = ab.y * ab.y - ab.x * ab.x;
    float m = ab.x * p.x / l; 
	float n = ab.y * p.y / l; 
	float m2 = m * m;
	float n2 = n * n;
    float c = (m2 + n2 - 1.0) / 3.0; 
	float c3 = c * c * c;
    float d = c3 + m2 * n2;
    float q = d + m2 * n2;
    float g = m + m * n2;

    float co;

    if (d < 0.0) {
        float h = acos(q / c3) / 3.0;
        float s = cos(h) + 2.0;
        float t = sin(h) * sqrt(3.0);
        float rx = sqrt(m2 - c * (s + t));
        float ry = sqrt(m2 - c * (s - t));
        co = ry + sign(l) * rx + abs(g) / (rx * ry);
    } else {
        float h = 2.0 * m * n * sqrt(d);
        float s = signNoZero(q + h) * pow(abs(q + h), 1.0 / 3.0);
        float t = signNoZero(q - h) * pow(abs(q - h), 1.0 / 3.0);
        float rx = -(s + t) - c * 4.0 + 2.0 * m2;
        float ry =  (s - t) * sqrt(3.0);
        float rm = sqrt(rx * rx + ry * ry);
        co = ry / sqrt(rm - rx) + 2.0 * g / rm;
    }

    co = (co - m) / 2.0;
    float si = sqrt(max(1.0 - co * co, 0.0));
    vec2 r = ab * vec2(co, si);
    return length(r - p) * signNoZero(p.y - r.y);
}
#endif

#if defined(SHAPE_ELLIPSOID)
vec3 transformFromUvToEllipsoidSpace(in vec3 positionUv) {
    // 1) Convert positionUv [0,1] to local space [-1,+1] to normalized cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height). A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
    // 2) Convert the 3D position to a 2D position relative to the ellipse (radii.x, radii.z) (assuming radii.x == radii.y which is true for WGS84). This is an optimization so that math can be done with ellipses instead of ellipsoids.
    // 3) Compute height from inner ellipse.
    // 4) Compute geodetic surface normal.
    // 5) Compute longitude from geodetic surface normal.
    // 6) Compute latitude from geodetic surface normal.
    vec3 pos3D = (positionUv * 2.0 - 1.0) * u_ellipsoidRadiiUv; // 1
    vec2 pos2D = vec2(length(pos3D.xy), pos3D.z); // 2
    float height = ellipseDistanceIterative(pos2D, u_ellipsoidInnerRadiiUv.xz); // 3
    vec3 geodeticSurfaceNormal = normalize(pos3D *  u_ellipsoidInverseRadiiSquaredUv); // 4
    float longitude = (atan(geodeticSurfaceNormal.y, geodeticSurfaceNormal.x) + czm_pi) / czm_twoPi; // 5
    float latitude = (asin(geodeticSurfaceNormal.z) + czm_piOverTwo) / czm_pi; // 6

    // #if (defined(ELLIPSOID_WEDGE_REGULAR) || defined(ELLIPSOID_WEDGE_FLIPPED))
    // {
    //     longitude = (longitude - u_ellipsoidWestUv) * u_ellipsoidInverseLongitudeRangeUv;
    // }
    // #endif
    // #if (defined(ELLIPSOID_CONE_BOT_REGULAR) || defined(ELLIPSOID_CONE_BOT_FLIPPED) || defined(ELLIPSOID_CONE_TOP_REGULAR) || defined(ELLIPSOID_CONE_TOP_FLIPPED))
    // {
    //     latitude = (latitude - u_ellipsoidSouthUv) * u_ellipsoidInverseLatitudeRangeUv;
    // }
    // #endif
    #if (defined(ELLIPSOID_INNER))
    {
        height *= u_ellipsoidInverseHeightDifferenceUv;
    }
    #endif

    return vec3(longitude, latitude, height);
}
#endif

#if defined(SHAPE_CYLINDER)
vec3 transformFromUvToCylinderSpace(in vec3 positionUv) {
    vec3 positionLocal = positionUv * 2.0 - 1.0; // [-1,+1]
    float radius = length(positionLocal.xy); // [0,1]
    float height = positionUv.z; // [0,1]
    float angle = (atan(positionLocal.y, positionLocal.x) + czm_pi) / czm_twoPi; // [0,1]
    vec3 positionShape = vec3(radius, height, angle);

    #if defined(BOUNDS)
        positionShape = (positionShape - u_minBoundsUv) * u_inverseBoundsUv; // [0,1]
        // TODO: This breaks down when minBounds == maxBounds. To fix it, this
        // function would have to know if ray is intersecting the front or back of the shape
        // and set the shape space position to 1 (front) or 0 (back) accordingly.
    #endif

    return positionShape;
}
#endif

vec3 transformFromUvToShapeSpace(in vec3 positionUv) {
    #if defined(SHAPE_BOX)
        vec3 positionShape = transformFromUvToBoxSpace(positionUv);
    #elif defined(SHAPE_ELLIPSOID)
        vec3 positionShape = transformFromUvToEllipsoidSpace(positionUv);
    #elif defined(SHAPE_CYLINDER)
        vec3 positionShape = transformFromUvToCylinderSpace(positionUv);
    #endif

    return positionShape;
}

// --------------------------------------------------------
// Megatexture
// --------------------------------------------------------

// TODO: 3D megatexture has not been implemented yet
#if defined(MEGATEXTURE_3D)
Properties getPropertiesFromMegatextureAtVoxelCoord(vec3 voxelCoord, ivec3 voxelDims, int tileIndex)
{
    // Tile location
    vec3 tileUvOffset = indexToUv3d(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

    // Voxel location
    vec3 voxelUvOffset = clamp(voxelCoord, vec3(0.5), vec3(voxelDims) - vec2(0.5)) * u_megatextureVoxelSizeUv;

    // Final location in the megatexture
    vec3 uv = tileUvOffset + voxelUvOffset;

    for (int i = 0; i < PROPERTY_COUNT; i++) {
        vec4 sample = texture3D(u_megatextureTextures[i], uv);
        samples[i] = decodeTextureSample(sample);
    }
}
#elif defined(MEGATEXTURE_2D)
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
Properties getPropertiesFrom2DMegatextureAtVoxelCoord(vec3 voxelCoord, ivec3 voxelDims, int tileIndex)
{
    #if defined(NEAREST_SAMPLING)
        // Round to the center of the nearest voxel
        voxelCoord = floor(voxelCoord) + vec3(0.5); 
    #endif

    // Tile location
    vec2 tileUvOffset = index1DTo2DTexcoord(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

    // Slice location
    float slice = voxelCoord.z - 0.5;
    int sliceIndex = int(floor(slice));
    int sliceIndex0 = intClamp(sliceIndex, 0, voxelDims.z - 1);
    vec2 sliceUvOffset0 = index1DTo2DTexcoord(sliceIndex0, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);

    // Voxel location
    vec2 voxelUvOffset = clamp(voxelCoord.xy, vec2(0.5), vec2(voxelDims.xy) - vec2(0.5)) * u_megatextureVoxelSizeUv;

    // Final location in the megatexture
    vec2 uv0 = tileUvOffset + sliceUvOffset0 + voxelUvOffset;

    #if defined(NEAREST_SAMPLING)
        return getPropertiesFrom2DMegatextureAtUv(uv0);
    #else
        float sliceLerp = fract(slice);
        int sliceIndex1 = intMin(sliceIndex + 1, voxelDims.z - 1);
        vec2 sliceUvOffset1 = index1DTo2DTexcoord(sliceIndex1, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);
        vec2 uv1 = tileUvOffset + sliceUvOffset1 + voxelUvOffset;
        Properties properties0 = getPropertiesFrom2DMegatextureAtUv(uv0);
        Properties properties1 = getPropertiesFrom2DMegatextureAtUv(uv1);
        return mixProperties(properties0, properties1, sliceLerp);
    #endif
}
#endif

Properties getPropertiesFromMegatextureAtTileUv(vec3 tileUv, int tileIndex) {
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    ivec3 dimensions = u_dimensions;

    #if defined(PADDING)
        dimensions += u_paddingBefore + u_paddingAfter;
        voxelCoord += vec3(u_paddingBefore);
    #endif

    #if defined(MEGATEXTURE_3D)
        return getPropertiesFrom3DMegatextureAtVoxelCoord(voxelCoord, dimensions, tileIndex);
    #elif defined(MEGATEXTURE_2D)
        return getPropertiesFrom2DMegatextureAtVoxelCoord(voxelCoord, dimensions, tileIndex);
    #endif
}

vec3 computeAncestorUv(vec3 positionUvLocal, int levelsAbove, ivec4 octreeCoords) {
    if (levelsAbove > 0) {
        // In some cases positionUvLocal goes outside the 0 to 1 bounds, such as when sampling neighbor voxels on the edge of a tile.
        // This needs to be handled carefully, especially for mixed resolution, or else the wrong part of the tile is read.
        // https://www.wolframalpha.com/input/?i=sign%28x%29+*+max%280%2C+%28abs%28x-0.5%29-0.5%29%29
        vec3 overflow = sign(positionUvLocal) * max(abs(positionUvLocal - vec3(0.5)) - vec3(0.5), vec3(0.0));
        positionUvLocal = clamp(positionUvLocal, vec3(0.0), vec3(1.0 - czm_epsilon6)); // epsilon to avoid fract(1) = 0 situation

        // Calcuate a new local uv relative to the ancestor tile.
        float levelsAboveFactor = 1.0 / pow(2.0, float(levelsAbove));
        positionUvLocal = fract((vec3(octreeCoords.xyz) + positionUvLocal) * levelsAboveFactor) + overflow * levelsAboveFactor;
    } else {
        positionUvLocal = clamp(positionUvLocal, vec3(0.0), vec3(1.0));
    }
    return positionUvLocal;
}

// Convert an array of mixed-resolution sample datas to a final weighted properties.
Properties getPropertiesFromMegatextureAtLocalPosition(vec3 positionUvLocal, ivec4 octreeCoords, SampleData sampleDatas[SAMPLE_COUNT]) {
    #if (SAMPLE_COUNT == 1)
        vec3 actualUv = computeAncestorUv(positionUvLocal, sampleDatas[0].levelsAbove, octreeCoords);
        return getPropertiesFromMegatextureAtTileUv(actualUv, sampleDatas[0].megatextureIndex);
    #else
        // When more than one sample is taken the accumulator needs to start at 0
        Properties properties = clearProperties();
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            vec3 actualUv = computeAncestorUv(positionUvLocal, sampleDatas[i].levelsAbove, octreeCoords);
            Properties tempProperties = getPropertiesFromMegatextureAtTileUv(actualUvLocal, sampleDatas[i].megatextureIndex);        
            properties = sumProperties(properties, tempProperties)
        }
        return properties;
    #endif
}

// --------------------------------------------------------
// Tree traversal
// --------------------------------------------------------

void getOctreeLeafData(OctreeNodeData data, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    #if (SAMPLE_COUNT == 1)
        sampleDatas[0].megatextureIndex = data.data;
        sampleDatas[0].levelsAbove = data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT ? 1 : 0;
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
        sampleDatas[0].levelsAbove = normU8_toInt(leafData0.z);
        sampleDatas[1].levelsAbove = normU8_toInt(leafData0.w);
        sampleDatas[0].weight = 1.0 - lerp;
        sampleDatas[1].weight = lerp;
    #endif
}

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

void traverseOctreeDownwards(in vec3 positionUv, inout ivec4 octreeCoords, inout int parentOctreeIndex, out SampleData sampleDatas[SAMPLE_COUNT]) {
    float sizeAtLevel = 1.0 / pow(2.0, float(octreeCoords.w));
    vec3 start = vec3(octreeCoords.xyz) * sizeAtLevel;
    vec3 end = start + vec3(sizeAtLevel);

    for (int i = 0; i < OCTREE_MAX_LEVELS; i++) {
        // Find out which octree child contains the position
        // 0 if before center, 1 if after
        vec3 center = 0.5 * (start + end);
        vec3 childCoord = step(center, positionUv);

        // Get octree coords for the next level down
        octreeCoords.xyz = octreeCoords.xyz * 2 + ivec3(childCoord);
        octreeCoords.w += 1;

        OctreeNodeData childData = getOctreeChildData(parentOctreeIndex, ivec3(childCoord));

        if (childData.flag == OCTREE_FLAG_INTERNAL) {
            // keep going deeper
            start = mix(start, center, childCoord);
            end = mix(center, end, childCoord);
            parentOctreeIndex = childData.data;
        } else {
            getOctreeLeafData(childData, sampleDatas);
            return;
        }
    }
}

void traverseOctree(in vec3 positionUv, out vec3 positionUvShapeSpace, out vec3 positionUvLocal, out float levelStepMult, out ivec4 octreeCoords, out int parentOctreeIndex, out SampleData sampleDatas[SAMPLE_COUNT]) {
    levelStepMult = 1.0;
    octreeCoords = ivec4(0);
    parentOctreeIndex = 0;

    // TODO: is it possible for this to be out of bounds, and does it matter?
    positionUvShapeSpace = transformFromUvToShapeSpace(positionUv);
    positionUvLocal = positionUvShapeSpace;

    OctreeNodeData rootData = getOctreeRootData();
    if (rootData.flag == OCTREE_FLAG_LEAF) {
        // No child data, only the root tile has data
        getOctreeLeafData(rootData, sampleDatas);
    }
    else
    {
        traverseOctreeDownwards(positionUvShapeSpace, octreeCoords, parentOctreeIndex, sampleDatas);
        levelStepMult = 1.0 / pow(2.0, float(octreeCoords.w));
        vec3 boxStart = vec3(octreeCoords.xyz) * levelStepMult;
        positionUvLocal = (positionUvShapeSpace - boxStart) / levelStepMult;
    }
}

void traverseOctreeFromExisting(in vec3 positionUv, out vec3 positionUvShapeSpace, out vec3 positionUvLocal, inout float levelStepMult, inout ivec4 octreeCoords, inout int parentOctreeIndex, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    float dimAtLevel = pow(2.0, float(octreeCoords.w));
    positionUvShapeSpace = transformFromUvToShapeSpace(positionUv);
    positionUvLocal = positionUvShapeSpace * dimAtLevel - vec3(octreeCoords.xyz);
    
    // Note: This code assumes the position is always inside the root tile.
    bool insideTile = octreeCoords.w == 0 || inRange(positionUvLocal, vec3(0.0), vec3(1.0)); 

    if (!insideTile)
    {
        // Go up tree
        for (int i = 0; i < OCTREE_MAX_LEVELS; i++)
        {
            octreeCoords.xyz /= ivec3(2);
            octreeCoords.w -= 1;
            dimAtLevel /= 2.0;

            positionUvLocal = positionUvShapeSpace * dimAtLevel - vec3(octreeCoords.xyz);
            insideTile = octreeCoords.w == 0 || inRange(positionUvLocal, vec3(0.0), vec3(1.0));
            
            if (!insideTile) {
                parentOctreeIndex = getOctreeParentIndex(parentOctreeIndex);
            } else {
                break;
            }
        }

        // Go down tree
        traverseOctreeDownwards(positionUvShapeSpace, octreeCoords, parentOctreeIndex, sampleDatas);
        levelStepMult = 1.0 / pow(2.0, float(octreeCoords.w));
        positionUvLocal = positionUvShapeSpace / levelStepMult - vec3(octreeCoords.xyz);
    }
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenUv = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw;
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord);
    vec3 eyeDirection = normalize(eyeCoordinate.xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;

    Intersections ix;
    vec2 entryExitT = intersectScene(fragCoord.xy, screenUv, viewPosUv, viewDirUv, ix);    

    // Exit early if the scene was completely missed.
    if (entryExitT == vec2(NO_HIT)) {
        discard;
    }

    float currT = entryExitT.x;
    float endT = entryExitT.y;
    vec3 positionUv = viewPosUv + currT * viewDirUv;

    vec4 colorAccum = vec4(0.0);

    #if defined(DESPECKLE)
        vec4 colorAccumTemp = vec4(0.0);
        int nonZeroCount = 0;
        int nonZeroMax = 3;
    #endif

    // Traverse the tree from the start position
    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
    float levelStepMult;
    ivec4 octreeCoords;
    int parentOctreeIndex;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctree(positionUv, positionUvShapeSpace, positionUvLocal, levelStepMult, octreeCoords, parentOctreeIndex, sampleDatas);
    
    // Adjust the step size based on the level in the tree
    float stepT = u_stepSize * levelStepMult;

    #if defined(JITTER)
        float noise = hash(screenUv); // [0,1]
        currT += noise * stepT;
        positionUv += noise * stepT * viewDirUv;
    #endif

    FragmentInput fragmentInput;
    #if defined(STATISTICS)
        setStatistics(fragmentInput.metadata.statistics);
    #endif

    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; stepCount++) {
        // Read properties from the megatexture based on the traversal state
        Properties properties = getPropertiesFromMegatextureAtLocalPosition(positionUvLocal, octreeCoords, sampleDatas);
        
        // Prepare the custom shader inputs
        copyPropertiesToMetadata(properties, fragmentInput.metadata);
        fragmentInput.voxel.positionUv = positionUv;
        fragmentInput.voxel.positionUvShapeSpace = positionUvShapeSpace;
        fragmentInput.voxel.positionUvLocal = positionUvLocal;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.travelDistance = stepT;

        #if defined(STYLE_USE_POSITION_EC)
            styleInput.positionEC = vec3(u_transformPositionUvToView * vec4(positionUv, 1.0));
        #endif

        // Run the custom shader
        czm_modelMaterial materialOutput;
        fragmentMain(fragmentInput, materialOutput);

        // Sanitize the custom shader output
        vec4 color = vec4(materialOutput.diffuse, materialOutput.alpha);
        color.rgb = max(color.rgb, vec3(0.0));
        color.a = clamp(color.a, 0.0, 1.0);

        #if defined(DESPECKLE)
            if (color.a < (1.0 - ALPHA_ACCUM_MAX)) {
                float partialAlpha = float(nonZeroCount) / float(nonZeroMax);
                colorAccum.a += partialAlpha * (colorAccumTemp.a - colorAccum.a);
                colorAccum.rgb += partialAlpha * colorAccumTemp.rgb;
                colorAccumTemp = vec4(0.0);
                nonZeroCount = 0;
            } else {
                nonZeroCount++;
                if (nonZeroCount == 1) {
                    colorAccumTemp.a = colorAccum.a;
                }
                colorAccumTemp += (1.0 - colorAccumTemp.a) * vec4(color.rgb * color.a, color.a);

                if (nonZeroCount >= nonZeroMax) {
                    colorAccum.a = colorAccumTemp.a;
                    colorAccum.rgb += colorAccumTemp.rgb;
                    colorAccumTemp = vec4(0.0);
                    nonZeroCount = 0;
                }
            }
        #else
            // Pre-multiplied alpha blend
            colorAccum += (1.0 - colorAccum.a) * vec4(color.rgb * color.a, color.a);
        #endif

        // Stop traversing if the alpha has been fully saturated
        if (colorAccum.a > ALPHA_ACCUM_MAX) {
            colorAccum.a = ALPHA_ACCUM_MAX;
            break;
        }

        // Keep raymarching
        currT += stepT;
        positionUv += stepT * viewDirUv;

        // Check if there's more intersections.
        if (currT > endT) {
            vec2 entryExitT = nextIntersection(ix);
            if (entryExitT == vec2(NO_HIT)) {
                break;
            } else {
                // Found another intersection. Keep raymarching.
                currT += entryExitT.x;
                endT += entryExitT.y;
                positionUv += entryExitT.x * viewDirUv;
            }
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctree but is optimized for the common
        // case where the ray is in the same tile as the previous step.
        traverseOctreeFromExisting(positionUv, positionUvShapeSpace, positionUvLocal, levelStepMult, octreeCoords, parentOctreeIndex, sampleDatas);

        // Adjust the step size based on the level in the tree
        stepT = u_stepSize * levelStepMult;
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