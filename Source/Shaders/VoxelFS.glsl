// world space: Cartesian WGS84
// local space: Cartesian [-0.5, 0.5] aligned with shape.
//   For box, the origin is the center of the box, and the six sides sit on the planes x = -0.5, x = 0.5 etc.
//   For cylinder, the origin is the center of the cylinder with the cylinder enclosed by the [-0.5, 0.5] box on xy-plane. Positive x-axis points to theta = 0. The top and bottom caps sit at planes z = -0.5, z = 0.5. Positive y points to theta = pi/2
//   For ellipsoid, the origin is the center of the ellipsoid. The maximum height of the ellipsoid touches -0.5, 0.5 in xyz directions.
// intersection space: local space times 2 to be [-1, 1]. Used for ray intersection calculation
// UV space: local space plus 0.5 to be [0, 1].
// shape space: In the coordinate system of the shape [0, 1]
//      For box, this is the same as UV space
//      For cylinder, the coordinate system is (radius, theta, z). theta = 0 is aligned with x axis
//      For ellipsoid, the coordinate system is (longitude, latitude, height). where 0 is the minimum value in each dimension, and 1 is the max.


// TODO is this necessary? Or should it go somewhere else?
precision highp int;

// Defines that are filled in from VoxelPrimitive.js
// #define METADATA_COUNT XYZ
// #define SAMPLE_COUNT XYZ
// #define NEAREST_SAMPLING

// Uniforms that are filled in from VoxelPrimitive.js
// uniform sampler2D u_megatextureTextures[METADATA_COUNT];

// Functions that are filled in from VoxelPrimitive.js
// Attributes sampleFrom2DMegatextureAtUv(vec2 uv);
// Attributes clearAttributes();
// Attributes sumAttributes(Attributes attributesA, Attributes attributesB);
// Attributes mixAttributes(Attributes attributesA, Attributes attributesB, float mixFactor);
// void setMinMaxAttributes(inout Voxel voxel);

#define OCTREE_MAX_LEVELS 32

#define OCTREE_FLAG_INTERNAL 0
#define OCTREE_FLAG_LEAF 1
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2

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

#if defined(SHAPE_ELLIPSOID)
uniform float u_ellipsoidHeightDifferenceUv;
uniform vec3 u_ellipsoidOuterRadiiLocal; // [0,1]
uniform vec3 u_ellipsoidInverseRadiiSquaredLocal;
#endif

// 2D megatexture
uniform ivec2 u_megatextureSliceDimensions; // number of slices per tile, in two dimensions
uniform ivec2 u_megatextureTileDimensions; // number of tiles per megatexture, in two dimensions
uniform vec2 u_megatextureVoxelSizeUv;
uniform vec2 u_megatextureSliceSizeUv;
uniform vec2 u_megatextureTileSizeUv;

uniform ivec3 u_dimensions; // does not include padding
#if defined(PADDING)
uniform ivec3 u_paddingBefore;
uniform ivec3 u_paddingAfter;
#endif

uniform vec4 u_minimumValues[METADATA_COUNT];
uniform vec4 u_maximumValues[METADATA_COUNT];
// uniform bool u_voxelQuantization[METADATA_COUNT];
uniform int u_channelCount[METADATA_COUNT];

uniform float u_stepSize;

uniform sampler2D u_octreeInternalNodeTexture;
uniform vec2 u_octreeInternalNodeTexelSizeUv;
uniform int u_octreeInternalNodeTilesPerRow;
uniform sampler2D u_octreeLeafNodeTexture;
uniform vec2 u_octreeLeafNodeTexelSizeUv;
uniform int u_octreeLeafNodeTilesPerRow;

uniform mat4 u_transformPositionViewToUv;
uniform mat4 u_transformPositionUvToView;
uniform mat3 u_transformDirectionViewToLocal;
uniform mat3 u_transformNormalLocalToWorld;
uniform vec3 u_cameraPositionUv;

#if defined(BOUNDS)
uniform vec3 u_minBounds; // Bounds from the voxel primitive
uniform vec3 u_maxBounds; // Bounds from the voxel primitive
uniform vec3 u_minBoundsUv; // Similar to u_minBounds but relative to UV space [0,1]
uniform vec3 u_maxBoundsUv; // Similar to u_maxBounds but relative to UV space [0,1]
uniform vec3 u_inverseBounds; // Equal to 1.0 / (u_maxBounds - u_minBounds)
uniform vec3 u_inverseBoundsUv; // Equal to 1.0 / (u_maxBoundsUv - u_minBoundsUv)
#endif

#if defined(CLIPPING_BOUNDS)
uniform vec3 u_minClippingBounds;
uniform vec3 u_maxClippingBounds;
#endif

#if defined(PICKING)
uniform vec4 u_pickColor;
#endif

// --------------------------------------------------------
// Misc math
// --------------------------------------------------------

#if defined(JITTER)
#define HASHSCALE1 50.0
float hash12(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * HASHSCALE1);
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

// --------------------------------------------------------
// Intersection tests, coordinate conversions, etc
// --------------------------------------------------------

struct Ray
{
    vec3 pos;
    vec3 dir;
};

const float NoHit = -czm_infinity;
const float InfHit = czm_infinity;

#if (defined(SHAPE_CYLINDER) && defined(BOUNDS)) || (defined(SHAPE_ELLIPSOID) && defined(BOUNDS))
vec2 resolveIntersections(vec2 intersections[SHAPE_INTERSECTION_COUNT])
{
    // TODO: completely skip shape if both of its Ts are below 0.0?
    vec2 tEntryExit = vec2(NoHit, NoHit);

    // Sort the intersections from min T to max T with bubble sort.
    // Note: If this sorting function changes, some of the intersection test may
    // need to be updated. Search for "bubble sort" to find those areas.

    const int sortPasses = SHAPE_INTERSECTION_COUNT - 1;
    for (int n = sortPasses; n > 0; --n)
    {
        for (int i = 0; i < sortPasses; ++i)
        {
            // The loop should be: for (i = 0; i < n; ++i) {...} but WebGL1 cannot
            // loop with non-constant condition, so it has to break early instead
            if (i >= n) { break; }
            
            vec2 intersect0 = intersections[i];
            vec2 intersect1 = intersections[i+1];

            float idx0 = intersect0.x;
            float idx1 = intersect1.x;
            float t0 = intersect0.y;
            float t1 = intersect1.y;

            float tmin = min(t0, t1);
            float tmax = max(t0, t1);
            float idxmin = tmin == t0 ? idx0 : idx1;
            float idxmax = tmin == t0 ? idx1 : idx0;

            intersections[i] = vec2(idxmin, tmin);
            intersections[i+1] = vec2(idxmax, tmax);            
        }
    }
        
    int surroundCount = 0;
    bool surroundIsPositive = false; 
    for (int i = 0; i < SHAPE_INTERSECTION_COUNT; i++)
    {
        vec2 entry = intersections[i];
        float idx = entry.x;
        float t = entry.y;

        bool currShapeIsPositive = idx <= 1.0;
        bool enter = mod(idx, 2.0) == 0.0;

        surroundCount += enter ? +1 : -1;
        surroundIsPositive = currShapeIsPositive ? enter : surroundIsPositive;
        
        // entering positive or exiting negative
        if (surroundCount == 1 && surroundIsPositive && enter == currShapeIsPositive) {
            tEntryExit.x = t;
        }
        
        // exiting positive or entering negative after being inside positive
        // TODO: Can this be simplified?
        if ((!enter && currShapeIsPositive && surroundCount == 0) || (enter && !currShapeIsPositive && surroundCount == 2 && surroundIsPositive)) {
            tEntryExit.y = t;

            // entry and exit have been found, so the loop can stop
            break;
        }
    }
    return tEntryExit;
}
#endif

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
        return vec2(NoHit, NoHit);
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
        return vec2(NoHit, NoHit);
    }

    return vec2(t, t);
}
#endif

#if defined(SHAPE_BOX)
vec2 intersectBoxShape(Ray ray)
{
    #if defined(BOUNDS)
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
    #else
        return intersectUnitCube(ray);
    #endif
}
#endif

#if (defined(SHAPE_CYLINDER) && (defined(BOUNDS_2_MIN) || defined(BOUNDS_2_MAX))) || (defined(SHAPE_ELLIPSOID) && (defined(BOUNDS_0_MIN) || defined(BOUNDS_0_MAX)))
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

    // if () return vec2(tmin, tmax);
    // else if () return vec2(NoHitNeg, tmin);
    // else if () return vec2(NoHitNeg, tmax);
    // else if () return vec2(tmax, NoHitPos);
    // else return vec2(NoHit, NoHit);

    if (e != g && f == h) return vec2(tmin, tmax);
    else if (e == g && f == h) return vec2(-InfHit, tmin);
    else if (e != g && f != h) return vec2(tmax, +InfHit);
    else return vec2(NoHit, NoHit);
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
        return vec2(NoHit, NoHit);
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
        t1 = abs(b + a * tCap) < det ? tCap : NoHit;
    }
    
    if (abs(z2) >= 1.0)
    {
        float tCap = (sign(z2) - o.z) / d.z;
        t2 = abs(b + a * tCap) < det ? tCap : NoHit;
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
        return vec2(NoHit, NoHit);
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
        return vec2(NoHit, NoHit);
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
vec2 intersectCylinderShape(Ray ray)
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

        if (outerIntersect == vec2(NoHit, NoHit)) {
            return vec2(NoHit, NoHit);
        }

        vec2 intersections[SHAPE_INTERSECTION_COUNT];
        intersections[0] = vec2(float(0), outerIntersect.x);
        intersections[1] = vec2(float(1), outerIntersect.y);
        
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

                // Note: If resolveIntersections() changes its sorting function
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
        
        return resolveIntersections(intersections);
    #endif
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
        return vec2(NoHit, NoHit);
    }
    
    det = sqrt(det);
    float t1 = -b - det;
    float t2 = -b + det;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    
    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID) && defined(BOUNDS_2_MIN)
vec2 intersectUnitSphereUnnormalizedDirection(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d, d);
    float b = dot(d, o);
    float c = dot(o, o) - 1.0;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NoHit, NoHit);
    }
    
    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    
    return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID) && (defined(BOUNDS_1_MIN) || defined(BOUNDS_1_MAX))
// TODO: can angle and direction be folded into the same parameter
vec2 intersectUncappedCone(Ray ray, float angle, float direction)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float s = direction;
    float h = max(0.01, angle); // float fix
    
    float hh = h * h;
    float ds = d[2] * s;
    float os = o[2] * s;
    float od = dot(o, d);
    float oo = dot(o, o);
    
    float a = ds * ds - hh;
    float b = ds * os - od * hh;
    float c = os * os - oo * hh;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NoHit, NoHit);
    }
    
    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);

    float h1 = (o[2] + tmin * d[2]) * s;
    float h2 = (o[2] + tmax * d[2]) * s;
 
    if (h1 < 0.0 && h2 < 0.0) {
        return vec2(NoHit, NoHit);
    }

    else if (h1 < 0.0) return vec2(tmax, NoHitPos);
    else if (h2 < 0.0) return vec2(NoHitNeg, tmin);
    else return vec2(tmin, tmax);
}
#endif

#if defined(SHAPE_ELLIPSOID) && defined(BOUNDS)
vec2 intersectClippedEllipsoid(Ray ray, vec3 minBounds, vec3 maxBounds)
{
    float lonMin = minBounds.x + 0.5 * czm_pi; // [-pi,+pi]
    float lonMax = maxBounds.x + 0.5 * czm_pi; // [-pi,+pi]
    float latMin = minBounds.y; // [-halfPi,+halfPi]
    float latMax = maxBounds.y; // [-halfPi,+halfPi]
    float heightMin = minBounds.z; // [-inf,+inf]
    float heightMax = maxBounds.z; // [-inf,+inf]
    
    vec2 outerIntersect = intersectUnitSphere(ray);
    if (outerIntersect == vec2(NoHit, NoHit)) {
        return vec2(NoHit, NoHit);
    }
    
    float intersections[SHAPE_INTERSECTION_COUNT];
    intersections[BOUNDS_2_MAX_IDX * 2 + 0] = outerIntersect.x;
    intersections[BOUNDS_2_MAX_IDX * 2 + 1] = outerIntersect.y;
    
    #if defined(BOUNDS_2_MIN)
        float innerScale = heightMin;
        Ray innerRay = Ray(ray.pos / innerScale, ray.dir / innerScale);
        vec2 innerIntersect = intersectUnitSphereUnnormalizedDirection(innerRay);
        intersections[BOUNDS_2_MIN_IDX * 2 + 0] = innerIntersect.x;
        intersections[BOUNDS_2_MIN_IDX * 2 + 1] = innerIntersect.y;
    #endif
        
    #if defined(BOUNDS_1_MIN)
        vec2 botConeIntersect = intersectUncappedCone(ray, abs(latMin), sign(latMin));
        intersections[BOUNDS_1_MIN_IDX * 2 + 0] = botConeIntersect.x;
        intersections[BOUNDS_1_MIN_IDX * 2 + 1] = botConeIntersect.y;
    #endif
    
    #if defined(BOUNDS_1_MAX)
        vec2 topConeIntersect = intersectUncappedCone(ray, abs(latMax), sign(latMax));
        intersections[BOUNDS_1_MAX_IDX * 2 + 0] = topConeIntersect.x;
        intersections[BOUNDS_1_MAX_IDX * 2 + 1] = topConeIntersect.y;
    #endif
    
    #if defined(BOUNDS_0_MIN) || defined(BOUNDS_0_MAX)
        vec3 planeNormal1 = -vec3(cos(lonMin), sin(lonMin), 0.0);
        vec3 planeNormal2 = vec3(cos(lonMax), sin(lonMax), 0.0);
        vec2 wedgeIntersect = intersectWedge(ray, planeNormal1, planeNormal2);
        intersections[BOUNDS_0_MIN_MAX_IDX * 2 + 0] = wedgeIntersect.x;
        intersections[BOUNDS_0_MIN_MAX_IDX * 2 + 1] = wedgeIntersect.y;
    #endif
    
    return resolveIntersections(intersections);   
}
#endif

#if defined(SHAPE_ELLIPSOID)
// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse

float ellipseDistanceIterative (vec2 p, in vec2 ab) {
    float px = abs(p[0]);
    float py = abs(p[1]);

    float tx = 0.707;
    float ty = 0.707;

    float a = ab.x;
    float b = ab.y;

    for (int i = 0; i < 3; i++) {
        float x = a * tx;
        float y = b * ty;

        float ex = (a*a - b*b) * pow(tx, 3.0) / a;
        float ey = (b*b - a*a) * pow(ty, 3.0) / b;

        float rx = x - ex;
        float ry = y - ey;

        float qx = px - ex;
        float qy = py - ey;

        float r = sqrt(ry * ry + rx * rx);
        float q = sqrt(qy * qy + qx * qx);

        tx = clamp((qx * r / q + ex) / a, 0.0, 1.0);
        ty = clamp((qy * r / q + ey) / b, 0.0, 1.0);
        float t = sqrt(ty * ty + tx * tx);
        tx /= t;
        ty /= t;
    }

    float cX = a * tx;
    float cY = b * ty;
    vec2 pos = vec2(cX * sign(p[0]), cY * sign(p[1]));
    return length(pos - p) * sign(py - cY);
}
#endif

#if defined(SHAPE_BOX)
vec3 transformFromUvToBoxSpace(in vec3 positionUv) {
    return positionUv;
}
#endif

#if defined(SHAPE_ELLIPSOID)
vec3 transformFromUvToEllipsoidSpace(in vec3 positionUv) {
    // 1) Convert positionUv [0,1] to unit space [-1, +1] in ellipsoid scale space.
    // 2) Convert to non-ellipsoid space. Max ellipsoid axis has value 1, anything shorter is < 1.
    // 3) Convert 3d position to 2D point relative to ellipse (since radii.x and radii.y are assumed to be equal for WGS84).
    // 4) Find closest distance. if distance > 1, it's outside the outer shell, if distance < u_ellipsoidMinimumHeightUv, it's inside the inner shell.
    // 5) Compute geodetic surface normal.
    // 6) Compute longitude and latitude from geodetic surface normal.

    vec3 posLocal = positionUv * 2.0 - 1.0; // 1
    vec3 pos3D = posLocal * u_ellipsoidOuterRadiiLocal; // 2
    vec2 pos2D = vec2(length(pos3D.xy), pos3D.z); // 3
    float dist = ellipseDistanceIterative(pos2D, u_ellipsoidOuterRadiiLocal.xz); // 4
    vec3 normal = normalize(pos3D * u_ellipsoidInverseRadiiSquaredLocal); // 5
    float longitude = atan(normal.y, normal.x); // 6
    float latitude = asin(normal.z); // 6

    #if defined(BOUNDS)
        float longitudeMin = u_minBounds.x;
        float longitudeMax = u_maxBounds.x;
        float latitudeMin = u_minBounds.x;
        float latitudeMax = u_minBounds.y;
        if (longitudeMin > longitudeMax) {
            longitudeMin -= czm_twoPi;
            if (longitude > longitudeMax) {
                longitude -= czm_twoPi;
            }
        }
        float shapeX = (longitude - longitudeMin) * u_boundsLengthInverse.x; // [0, 1]
        float shapeY = (latitude - latitudeMin) * u_boundsLengthInverse.y; // [0, 1]
    #else
        float shapeX = (longitude / czm_pi) * 0.5 + 0.5;
        float shapeY = (latitude / czm_piOverTwo) * 0.5 + 0.5;
    #endif

    float distMax = 0.0;
    float distMin = -u_ellipsoidHeightDifferenceUv;
    float shapeZ = (dist - distMin) / (distMax - distMin);
    return vec3(shapeX, shapeY, shapeZ);
}
#endif

#if defined(SHAPE_CYLINDER)
vec3 transformFromUvToCylinderSpace(in vec3 positionUv) {
    vec3 positionLocal = positionUv * 2.0 - 1.0; // [-1,+1]
    float radius = length(positionLocal.xy); // [0,1]
    float height = positionUv.z; // [0,1]
    float angle = (atan(positionLocal.y, positionLocal.x) + czm_pi) / czm_twoPi; // [0,1]
    return vec3(radius, height, angle);
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

    #if defined(BOUNDS)
        positionShape = (positionShape - u_minBoundsUv) * u_inverseBoundsUv; // [0,1]
        // TODO: This breaks down when minBounds == maxBounds. To fix it, this
        // function would have to know if ray is intersecting the front or back of a shape
        // and set the shape space position to 1 (front) or 0 (back) accordingly.
    #endif

    return positionShape;
}

#if defined(SHAPE_ELLIPSOID)
vec3 geodeticSurfaceNormalCartographic(float longitude, float latitude) {
    float cosLatitude = cos(latitude);
    float x = cosLatitude * cos(longitude);
    float y = cosLatitude * sin(longitude);
    float z = sin(latitude);
    return normalize(vec3(x, y, z));
}
vec3 cartographicToCartesianUv(float longitude, float latitude, float height) {
    vec3 normal = geodeticSurfaceNormalCartographic(longitude, latitude);
    vec3 k = normal * u_ellipsoidOuterRadiiLocal * u_ellipsoidOuterRadiiLocal;
    k /= sqrt(dot(normal, k));
    vec3 final = normal * height + k;
    return final * 0.5 + 0.5;
}
#endif

vec3 transformFromShapeSpaceToUv(in vec3 positionUvShapeSpace) {
    #if defined(SHAPE_CYLINDER)
        float dist = positionUvShapeSpace.x;
        float angle = czm_twoPi * safeMod(positionUvShapeSpace.y, 1.0);
        float slice = positionUvShapeSpace.z;
        float x = 0.5 + 0.5 * dist * cos(angle);
        float y = 0.5 + 0.5 * dist * sin(angle);
        float z = slice;
        return vec3(x, y, z);
    #elif defined(SHAPE_ELLIPSOID)
        #if defined(BOUNDS)
            float longitudeMin = u_minBounds.x;
            float longitudeMax = u_maxBounds.x;
            float latitudeMin = u_minBounds.y;
            float latitudeMax = u_maxBounds.y;
            float longitude = mix(longitudeMin, longitudeMax, positionUvShapeSpace.x);
            float latitude = mix(latitudeMin, latitudeMax, positionUvShapeSpace.y);
            float height = mix(-u_ellipsoidHeightDifferenceUv, 0.0, positionUvShapeSpace.z);
        #else
            float longitude = positionUvShapeSpace.x * czm_twoPi - czm_pi;
            float latitude = positionUvShapeSpace.y * czm_pi - czm_piOverTwo;
            float height = positionUvShapeSpace.z;
        #endif
        return cartographicToCartesianUv(longitude, latitude, height);
    #else
        return positionUvShapeSpace;
    #endif
}

// --------------------------------------------------------
// Megatexture
// --------------------------------------------------------

#if defined(MEGATEXTURE_IS_3D)
// TODO: 3D textures have not been implemented yet

void sampleFrom3DMegatextureAtUv(vec3 uv, out Attributes attributes)
{
    // Looping over the sampler array was causing strange rendering artifacts even though the shader compiled fine.
    // Unroling the for loop fixed the problem.

    // for (int i = 0; i < METADATA_COUNT; i++)
    // {
    //     samples[i] = texture3D(u_megatextureTextures[i], uv);
    // }

    #if (METADATA_COUNT >= 1)
    samples[0] = texture3D(u_megatextureTextures[0], uv); 
    #endif
    #if (METADATA_COUNT >= 2)
    samples[1] = texture3D(u_megatextureTextures[1], uv); 
    #endif
    #if (METADATA_COUNT >= 3)
    samples[2] = texture3D(u_megatextureTextures[2], uv); 
    #endif
    #if (METADATA_COUNT >= 4)
    samples[3] = texture3D(u_megatextureTextures[3], uv); 
    #endif

    decodeTextureSamples(samples);
}

// TODO: this function has not been implemented
vec3 indexToUv3D(int index, ivec3 dimensions, vec3 uvScale)
{
    return vec3(0.0);
}

// TODO: this function has not been tested
void sampleFromMegatextureAtVoxelCoord(vec3 voxelCoord, ivec3 voxelDims, int tileIndex, out Attributes attributes)
{
    // Tile location
    vec3 tileUvOffset = indexToUv3d(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

    // Voxel location
    vec3 voxelUvOffset = clamp(voxelCoord, vec3(0.5), vec3(voxelDims) - vec2(0.5)) * u_megatextureVoxelSizeUv;

    // Final location in the megatexture
    vec3 uv = tileUvOffset + voxelUvOffset;

    for (int i = 0; i < METADATA_COUNT; i++) {
        vec4 sample = texture3D(u_megatextureTextures[i], uv);
        samples[i] = decodeTextureSample(sample);
    }
}

#else // MEGATEXTURE_IS_2D
/*
    How 3D data is stored in a 2D megatexture

    2D megatexture with a single 2x2x2 voxel tile:
    The tile is split into two "slices" by Z:

      0   1   2   3
    +---+---+---+---+
    |   |   |   |   | 3
    +---+---+---+---+
    |   |   |   |   | 2
    +---+---+---+---+
    |010|110|011|111| 1
    +---+---+---+---+
    |000|100|001|101| 0
    +---+---+---+---+

    (The megatexture likes to be power of two even if it means some empty space)

    When the 3D coordinate's Z value is between two slices:

    2 +---+
      |001|
    1 +-z-+
      |000|
    0 +---+

    The interpolation between the bottom and the top voxel is 0.5
    More generally, the interpolation is: fract(coord.z - 0.5)
*/

vec2 indexToUv2D(int index, ivec2 dimensions, vec2 uvScale) {
    int indexX = intMod(index, dimensions.x);
    int indexY = index / dimensions.x;
    return vec2(indexX, indexY) * uvScale;
}
Attributes sampleFrom2DMegatextureAtVoxelCoord(vec3 voxelCoord, ivec3 voxelDims, int tileIndex)
{
    #if defined(NEAREST_SAMPLING)
        // Round to the center of the nearest voxel
        voxelCoord = floor(voxelCoord) + vec3(0.5); 
    #endif

    // Tile location
    vec2 tileUvOffset = indexToUv2D(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

    // Slice locations
    float slice = voxelCoord.z - 0.5;
    float sliceLerp = fract(slice);
    int sliceIndex = int(floor(slice));
    int sliceIndex0 = intMax(sliceIndex, 0);
    int sliceIndex1 = intMin(sliceIndex + 1, voxelDims.z - 1);
    vec2 sliceUvOffset0 = indexToUv2D(sliceIndex0, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);
    vec2 sliceUvOffset1 = indexToUv2D(sliceIndex1, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);

    // Voxel location
    vec2 voxelUvOffset = clamp(voxelCoord.xy, vec2(0.5), vec2(voxelDims.xy) - vec2(0.5)) * u_megatextureVoxelSizeUv;

    // Final location in the megatexture
    vec2 uv0 = tileUvOffset + sliceUvOffset0 + voxelUvOffset;
    vec2 uv1 = tileUvOffset + sliceUvOffset1 + voxelUvOffset;

    #if defined(NEAREST_SAMPLING)
        return sampleFrom2DMegatextureAtUv(uv0);
    #else
        Attributes attributes0 = sampleFrom2DMegatextureAtUv(uv0);
        Attributes attributes1 = sampleFrom2DMegatextureAtUv(uv1);
        return mixAttributes(attributes0, attributes1, sliceLerp);
    #endif
}
#endif

Attributes sampleFromMegatextureAtTileUv(vec3 tileUv, int tileIndex) {
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    ivec3 dimensions = u_dimensions;

    #if defined(PADDING)
        dimensions += u_paddingBefore + u_paddingAfter;
        voxelCoord += vec3(u_paddingBefore);
    #endif

    #if defined(MEGATEXTURE_IS_3D)
        return sampleFrom3DMegatextureAtVoxelCoord(voxelCoord, dimensions, tileIndex);
    #else
        return sampleFrom2DMegatextureAtVoxelCoord(voxelCoord, dimensions, tileIndex);
    #endif
}

// --------------------------------------------------------
// Octree traversal
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

// Convert an array of mixed-resolution sample datas to a final weighted sample.
Attributes getSamplesAtLocalPosition(in vec3 positionUvLocal, in ivec4 octreeCoords, in SampleData sampleDatas[SAMPLE_COUNT]) {
    // In some cases positionUvLocal goes outside the 0 to 1 bounds, such as when sampling neighbor voxels on the edge of a tile.
    // This needs to be handled carefully, especially for mixed resolution, or else the wrong part of the tile is read.
    // https://www.wolframalpha.com/input/?i=sign%28x%29+*+max%280%2C+%28abs%28x-0.5%29-0.5%29%29
    vec3 overflow = sign(positionUvLocal) * max(abs(positionUvLocal - vec3(0.5)) - vec3(0.5), vec3(0.0));
    positionUvLocal = clamp(positionUvLocal, vec3(0.0), vec3(1.0 - czm_epsilon6)); // epsilon to avoid fract(1) = 0 situation

    Attributes attributes;

    // When more than one sample is taken the accumulator needs to start at 0
    #if (SAMPLE_COUNT > 1)
        attributes = clearAttributes();
    #endif

    for (int i = 0; i < SAMPLE_COUNT; i++) {
        SampleData sampleData = sampleDatas[i];
        vec3 actualUvLocal = positionUvLocal;
        int levelsAbove = sampleData.levelsAbove;
        if (levelsAbove > 0) {
            // Calcuate a new local uv relative to the ancestor tile.
            float levelsAboveFactor = 1.0 / pow(2.0, float(levelsAbove));
            actualUvLocal = fract((vec3(octreeCoords.xyz) + positionUvLocal) * levelsAboveFactor) + overflow * levelsAboveFactor;
        }

        Attributes tempAttributes = sampleFromMegatextureAtTileUv(actualUvLocal, sampleData.megatextureIndex);
        
        #if (SAMPLE_COUNT == 1)
            attributes = tempAttributes;
        #else
            attributes = sumAttributes(attributes, tempAttributes)
        #endif
    }
    return attributes;
}

Attributes getSamplesAtPosition(vec3 positionUv, vec4 outOfBoundsValue) {
    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
    float levelStepMult;
    ivec4 octreeCoords;
    int parentOctreeIndex;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctree(positionUv, positionUvShapeSpace, positionUvLocal, levelStepMult, octreeCoords, parentOctreeIndex, sampleDatas);
    return getSamplesAtLocalPosition(positionUvLocal, octreeCoords, sampleDatas);  
}
Attributes getSamplesAtPosition(vec3 positionUv) {
    return getSamplesAtPosition(positionUv, vec4(0.0));
}

// void getNormalAtPosition(ivec4 octreeCoords, vec3 positionUvShapeSpace, vec3 positionUvLocal, SampleData sampleDatas[SAMPLE_COUNT], out vec3 normalLocalSpace[METADATA_COUNT], out vec3 normalWorldSpace[METADATA_COUNT], out vec3 normalViewSpace[METADATA_COUNT], out bool valid[METADATA_COUNT]) {
//     for (int i = 0; i < METADATA_COUNT; i++){
//         valid[i] = true;
//     }

//     Attributes attributes;
//     #define USE_SIMPLE_NORMALS
//     #if defined(NEIGHBORS_INCLUDED_ON_TILE_EDGES) || defined(USE_SIMPLE_NORMALS)
//         // There might be small seam artifacts when the edge count is 1 or less.
//         float sampleL[METADATA_COUNT];
//         float sampleR[METADATA_COUNT];
//         float sampleD[METADATA_COUNT];
//         float sampleU[METADATA_COUNT];
//         float sampleB[METADATA_COUNT];
//         float sampleF[METADATA_COUNT];
//         getSamplesAtLocalPosition(positionUvLocal + vec3(-1.0, 0.0, 0.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleL[i] = attributes[i].a;
//         }
//         getSamplesAtLocalPosition(positionUvLocal + vec3(+1.0, 0.0, 0.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleR[i] = attributes[i].a;
//         }
//         getSamplesAtLocalPosition(positionUvLocal + vec3(0.0, -1.0, 0.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleD[i] = attributes[i].a;
//         }
//         getSamplesAtLocalPosition(positionUvLocal + vec3(0.0, +1.0, 0.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleU[i] = attributes[i].a;
//         }
//         getSamplesAtLocalPosition(positionUvLocal + vec3(0.0, 0.0, -1.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleB[i] = attributes[i].a;
//         }
//         getSamplesAtLocalPosition(positionUvLocal + vec3(0.0, 0.0, +1.0) / vec3(u_dimensions), octreeCoords, sampleDatas, attributes);
//         for(int i = 0; i < METADATA_COUNT; i++) {
//             sampleF[i] = attributes[i].a;
//         }
//     #else
//         float dimAtLevel = pow(2.0, float(octreeCoords.w));
//         vec3 voxelSizeShapeSpace = 1.0 / (dimAtLevel * vec3(u_dimensions));

//         // There might be small seam artifacts when the edge count is 0
//         float sampleL[METADATA_COUNT];
//         float sampleR[METADATA_COUNT];
//         float sampleD[METADATA_COUNT];
//         float sampleU[METADATA_COUNT];
//         float sampleB[METADATA_COUNT];
//         float sampleF[METADATA_COUNT];
//         getSamplesAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace - vec3(voxelSizeShapeSpace.x, 0.0, 0.0), attributes));
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleL[i] = attributes[i].a;
//         }
//         getSampleAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace + vec3(voxelSizeShapeSpace.x, 0.0, 0.0))).a;
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleR[i] = attributes[i].a;
//         }
//         getSampleAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace - vec3(0.0, voxelSizeShapeSpace.y, 0.0))).a;
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleD[i] = attributes[i].a;
//         }
//         getSampleAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace + vec3(0.0, voxelSizeShapeSpace.y, 0.0))).a;
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleU[i] = attributes[i].a;
//         }
//         getSampleAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace - vec3(0.0, 0.0, voxelSizeShapeSpace.z))).a;
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleB[i] = attributes[i].a;
//         }
//         getSampleAtPosition(transformFromShapeSpaceToUv(positionUvShapeSpace + vec3(0.0, 0.0, voxelSizeShapeSpace.z))).a;
//         for(int i; i<METADATA_COUNT; i++) {
//             sampleF[i] = attributes[i].a;
//         }
//     #endif

//     for (int i = 0; i < METADATA_COUNT; i++) {
//         valid[i] = inRange(sampleL[i], u_minimumValues[i].a, u_maximumValues[i].a) &&
//                 inRange(sampleR[i], u_minimumValues[i].a, u_maximumValues[i].a) &&
//                 inRange(sampleD[i], u_minimumValues[i].a, u_maximumValues[i].a) &&
//                 inRange(sampleU[i], u_minimumValues[i].a, u_maximumValues[i].a) &&
//                 inRange(sampleB[i], u_minimumValues[i].a, u_maximumValues[i].a) &&
//                 inRange(sampleF[i], u_minimumValues[i].a, u_maximumValues[i].a);    

//         normalLocalSpace[i] = normalize(vec3(sampleR[i] - sampleL[i], sampleU[i] - sampleD[i], sampleF[i] - sampleB[i]));

//         #if defined(SHAPE_ELLIPSOID)
//             float longitudeMin = u_ellipsoidLongitudeBounds.x;
//             float longitudeMax = u_ellipsoidLongitudeBounds.y;
//             float latitudeMin = u_ellipsoidLatitudeBounds.x;
//             float latitudeMax = u_ellipsoidLatitudeBounds.y;
//             float longitude = mix(longitudeMin, longitudeMax, positionUvShapeSpace.x) + 0.2 * normalLocalSpace[i].x;
//             float latitude = mix(latitudeMin, latitudeMax, positionUvShapeSpace.y) + 0.2 * normalLocalSpace[i].y;

//             float cosLatitude = cos(latitude);
//             float x = cosLatitude * cos(longitude);
//             float y = cosLatitude * sin(longitude);
//             float z = sin(latitude);
//             normalWorldSpace[i] = normalize(vec3(x, y, z));
//         #elif defined(SHAPE_CYLINDER)
//             float angle = czm_twoPi * positionUvShapeSpace.y + 0.02 * 0.5 * czm_pi * normalLocalSpace[i].y;
//             float x = cos(angle);
//             float y = sin(angle);
//             float z = normalLocalSpace[i].z;
//             normalWorldSpace[i] = normalize(u_modelToWorldNormal * vec3(x, y, z));
//         #endif

//         normalViewSpace[i] = normalize(czm_viewRotation * normalWorldSpace[i]);
//     }
// }

vec2 intersectShape(vec3 positionUv, vec3 directionUv) {
    // Do a ray-shape intersection to find the exact starting and ending points.
    // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
    // Direction is scaled as well to be in sync with position. 
    Ray ray = Ray(positionUv * 2.0 - 1.0, directionUv * 2.0);

    #if defined(SHAPE_BOX)
        vec2 tEntryExit = intersectBoxShape(ray);
    #elif defined(SHAPE_CYLINDER)
        vec2 tEntryExit = intersectCylinderShape(ray);
    #elif defined(SHAPE_ELLIPSOID)
        vec2 tEntryExit = intersectEllipsoidShape(ray);
    #endif

    if (tEntryExit.x < 0.0 && tEntryExit.y < 0.0) {
        // Intersection is invalid when start and end are behind the ray.
        return vec2(NoHit, NoHit);
    }

    // Set start to 0 when ray is inside the shape.
    tEntryExit.x = max(tEntryExit.x, 0.0);

    return tEntryExit;
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 uv = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw;
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord);
    vec3 eyeDirection = normalize(eyeCoordinate.xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;

    vec2 tEntryExit = intersectShape(viewPosUv, viewDirUv);

    // If the shape was completely missed, don't render anything and exit early.
    if (tEntryExit == vec2(NoHit, NoHit)) {
        discard;
    }

    float currT = tEntryExit.x;
    float endT = tEntryExit.y;
    vec3 positionUv = viewPosUv + tEntryExit.x * viewDirUv;
    
    #if defined(DEPTH_TEST)
        // If the depth is in front of the shape, discard early. Otherwise, calculate how
        // far the ray will travel before it hits the depth buffer.
        float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, uv));

        // If there's no depth at this position set it to some really large value.
        float depthT = czm_infinity;

        if (logDepthOrDepth != 0.0) {
            vec4 eyeCoordinateDepth = czm_windowToEyeCoordinates(fragCoord.xy, logDepthOrDepth);
            eyeCoordinateDepth /= eyeCoordinateDepth.w;
            vec3 depthPositionUv = vec3(u_transformPositionViewToUv * eyeCoordinateDepth);
            depthT = dot(viewDirUv, depthPositionUv - viewPosUv);

            // Exit early if the depth is before the start position.
            if (depthT <= currT) {
                discard;
            }
        }
    #endif

    vec4 colorAccum = vec4(0.0);
    const float alphaAccumMax = 0.98;

    #if defined(DESPECKLE)
        vec4 colorAccumTemp = vec4(0.0);
        int nonZeroCount = 0;
        int nonZeroMax = 3;
    #endif

    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
    float levelStepMult;
    ivec4 octreeCoords;
    int parentOctreeIndex;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctree(positionUv, positionUvShapeSpace, positionUvLocal, levelStepMult, octreeCoords, parentOctreeIndex, sampleDatas);
    float stepT = u_stepSize * levelStepMult;

    #if defined(JITTER)
        float noise = hash12(uv); // [0,1]
        positionUv += noise * stepT * viewDirUv;
        currT += noise * stepT;
    #endif

    const int stepCountMax = 1000;
    for (int stepCount = 0; stepCount < stepCountMax; stepCount++) {
        FragmentInput fragmentInput;
        fragmentInput.voxel.positionUv = positionUv;
        fragmentInput.voxel.positionUvShapeSpace = positionUvShapeSpace;
        fragmentInput.voxel.positionUvLocal = positionUvLocal;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.travelDistance = stepT;

        #if defined(HAS_MIN_MAX)
            setMinMaxAttributes(fragmentInput.voxel);
        #endif

        fragmentInput.attributes = getSamplesAtLocalPosition(positionUvLocal, octreeCoords, sampleDatas);

        // #if defined(STYLE_USE_NORMAL)
        //     vec3 normalLocal[METADATA_COUNT];
        //     vec3 normalWorld[METADATA_COUNT];
        //     vec3 normalView[METADATA_COUNT];
        //     bool normalValid[METADATA_COUNT];
        //     getNormalAtPosition(octreeCoords, positionUvShapeSpace, positionUvLocal, sampleDatas, normalLocal, normalWorld, normalView, normalValid);
        //     setStyleInputNormals(normalLocal, normalWorld, normalView, normalValid, styleInput);
        // #endif

        #if defined(STYLE_USE_POSITION_EC)
            styleInput.positionEC = vec3(u_transformPositionUvToView * vec4(positionUv, 1.0));
        #endif

        czm_modelMaterial materialOutput;
        fragmentMain(fragmentInput, materialOutput);
        vec4 finalSample = vec4(materialOutput.diffuse, materialOutput.alpha);

        // Sanitize the custom shader output
        finalSample = max(finalSample, vec4(0.0));
        finalSample.a = min(finalSample.a, 1.0);

        #if defined(DESPECKLE)
            if (finalSample.a < (1.0 - alphaAccumMax)) {
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
                colorAccumTemp += (1.0 - colorAccumTemp.a) * vec4(finalSample.rgb * finalSample.a, finalSample.a);

                if (nonZeroCount >= nonZeroMax) {
                    colorAccum.a = colorAccumTemp.a;
                    colorAccum.rgb += colorAccumTemp.rgb;
                    colorAccumTemp = vec4(0.0);
                    nonZeroCount = 0;
                }
            }
        #else
            colorAccum += (1.0 - colorAccum.a) * vec4(finalSample.rgb * finalSample.a, finalSample.a);
        #endif

        // Stop traversing if the alpha has been fully saturated
        if (colorAccum.a > alphaAccumMax) {
            colorAccum.a = alphaAccumMax;
            break;
        }

        // Keep raymarching
        currT += stepT;
        positionUv += stepT * viewDirUv;

        // Check if the ray is occluded by the depth
        #if defined(DEPTH_TEST)
            if (currT >= depthT) {
                break;
            }
        #endif

        // Check if the ray has entered empty space. If so, do another intersection test
        // to see if there is more of the shape to intersect. If there isn't, the raymarch is over. 
        if (currT > endT) {
            vec2 tEntryExit = intersectShape(positionUv, viewDirUv);
            if (tEntryExit == vec2(NoHit, NoHit)) {
                break;
            }        
            currT += tEntryExit.x;
            endT += tEntryExit.y;
            positionUv += tEntryExit.x * viewDirUv;
        }

        // Traverse the octree from the current ray position.
        // This is an optimized alternative to traverseOctree that expects the
        // ray to stay in the same tile on average. Otherwise it will traverse
        // upwards and back downwards.
        traverseOctreeFromExisting(positionUv, positionUvShapeSpace, positionUvLocal, levelStepMult, octreeCoords, parentOctreeIndex, sampleDatas);
        stepT = u_stepSize * levelStepMult;
    }

    // Convert the alpha from [0,alphaAccumMax] to [0,1]
    colorAccum.a /= alphaAccumMax;

    #if defined(PICKING)
        // If alpha is 0.0, there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        gl_FragColor = u_pickColor;
    #else
        gl_FragColor = colorAccum;
    #endif
}