// See IntersectionUtils.glsl for the definitions of Ray and NO_HIT
// See convertUvToBox.glsl for the definition of convertShapeUvToUvSpace

/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_INTERSECTION_INDEX ### // always 0
#define BOX_HAS_RENDER_BOUNDS
#define BOX_IS_2D
*/

#if defined(BOX_HAS_RENDER_BOUNDS)
    #if defined(BOX_IS_2D)
        // This matrix bakes in an axis conversion so that the math works for XY plane.
        uniform mat4 u_boxUvToRenderBoundsTransform;
    #else
        // Similar to u_boxTransformUvToBounds but fewer instructions needed.
        uniform vec3 u_boxUvToRenderBoundsScale;
        uniform vec3 u_boxUvToRenderBoundsTranslate;
    #endif
#endif

struct Box {
    vec3 p0;
    vec3 p1;
};

Box constructVoxelBox(in ivec4 octreeCoords, in vec3 tileUv)
{
    // Find the min/max cornerpoints of the voxel in tile coordinates
    vec3 tileOrigin = vec3(octreeCoords.xyz);
    vec3 numSamples = vec3(u_dimensions);
    vec3 voxelSize = 1.0 / numSamples;
    vec3 coordP0 = floor(tileUv * numSamples) * voxelSize + tileOrigin;
    vec3 coordP1 = coordP0 + voxelSize;

    // Transform to the UV coordinates of the scaled tileset
    float tileSize = 1.0 / pow(2.0, float(octreeCoords.w));
    vec3 p0 = convertShapeUvToUvSpace(coordP0 * tileSize);
    vec3 p1 = convertShapeUvToUvSpace(coordP1 * tileSize);

    return Box(p0, p1);
}

// Find the distances along a ray at which the ray intersects an axis-aligned box
// See https://tavianator.com/2011/ray_box.html
vec2 intersectBox(in Ray ray, in Box box, in vec2 entryExit)
{
    // Consider the box as the intersection of the space between 3 pairs of parallel planes
    // Compute the distance along the ray to each plane
    vec3 dInv = 1.0 / ray.dir; // TODO: Input this
    vec3 t0 = (box.p0 - ray.pos) * dInv;
    vec3 t1 = (box.p1 - ray.pos) * dInv;

    // Identify candidate entries/exits based on distance from ray.pos
    vec3 entries = max(min(t0, t1), entryExit.x);
    vec3 exits = min(max(t0, t1), entryExit.y);

    // The actual box intersection points are the furthest entry and the closest exit
    float entry = max(max(entries.x, entries.y), entries.z);
    float exit = min(min(exits.x, exits.y), exits.z);

    if (entry >= exit) {
        return vec2(NO_HIT);
    }

    return vec2(entry, exit);
}

vec2 intersectUnitCube(Ray ray) // Unit cube from [-1, +1]
{
    vec3 dInv = 1.0 / ray.dir; // TODO: input this
    vec3 od = -ray.pos * dInv;
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

void intersectShape(Ray ray, inout Intersections ix)
{
    #if defined(BOX_HAS_RENDER_BOUNDS)
        #if defined(BOX_IS_2D)
            // Transform the ray into unit square space on Z plane
            // This matrix bakes in an axis conversion so that the math works for XY plane.
            ray.pos = vec3(u_boxUvToRenderBoundsTransform * vec4(ray.pos, 1.0));
            ray.dir = vec3(u_boxUvToRenderBoundsTransform * vec4(ray.dir, 0.0));
            vec2 entryExit = intersectUnitSquare(ray);
        #else
            // Transform the ray into unit cube space
            ray.pos = ray.pos * u_boxUvToRenderBoundsScale + u_boxUvToRenderBoundsTranslate;
            ray.dir *= u_boxUvToRenderBoundsScale;
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
