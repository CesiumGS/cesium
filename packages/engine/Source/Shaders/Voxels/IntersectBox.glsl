// See IntersectionUtils.glsl for the definitions of Ray and NO_HIT
// See convertUvToBox.glsl for the definition of convertShapeUvToUvSpace

/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_INTERSECTION_INDEX ### // always 0
*/

uniform vec3 u_renderMinBounds;
uniform vec3 u_renderMaxBounds;

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

vec3 getBoxNormal(in Box box, in Ray ray, in float t)
{
    vec3 hitPoint = ray.pos + t * ray.dir;
    vec3 lower = step(hitPoint, box.p0);
    vec3 upper = step(box.p1, hitPoint);
    return normalize(upper - lower);
}

// Find the distances along a ray at which the ray intersects an axis-aligned box
// See https://tavianator.com/2011/ray_box.html
RayShapeIntersection intersectBox(in Ray ray, in Box box)
{
    // Consider the box as the intersection of the space between 3 pairs of parallel planes
    // Compute the distance along the ray to each plane
    vec3 t0 = (box.p0 - ray.pos) * ray.dInv;
    vec3 t1 = (box.p1 - ray.pos) * ray.dInv;

    // Identify candidate entries/exits based on distance from ray.pos
    vec3 entries = min(t0, t1);
    vec3 exits = max(t0, t1);

    // The actual box intersection points are the furthest entry and the closest exit
    float entryT = max(max(entries.x, entries.y), entries.z);
    float exitT = min(min(exits.x, exits.y), exits.z);

    vec3 entryNormal = getBoxNormal(box, ray, entryT - RAY_SHIFT);
    vec3 exitNormal = getBoxNormal(box, ray, exitT + RAY_SHIFT);

    if (entryT > exitT) {
        entryT = NO_HIT;
        exitT = NO_HIT;
    }

    return RayShapeIntersection(vec4(entryNormal, entryT), vec4(exitNormal, exitT));
}

void intersectShape(in Ray ray, inout Intersections ix)
{
    RayShapeIntersection intersection = intersectBox(ray, Box(u_renderMinBounds, u_renderMaxBounds));
    setShapeIntersection(ix, BOX_INTERSECTION_INDEX, intersection);
}
