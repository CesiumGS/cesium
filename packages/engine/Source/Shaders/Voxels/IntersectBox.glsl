// See IntersectionUtils.glsl for the definitions of Ray, RayShapeIntersection,
// NO_HIT, Intersections

/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_INTERSECTION_INDEX ### // always 0
*/

uniform vec3 u_renderMinBounds;
uniform vec3 u_renderMaxBounds;

RayShapeIntersection intersectBox(in Ray ray, in vec3 minBound, in vec3 maxBound)
{
    // Consider the box as the intersection of the space between 3 pairs of parallel planes
    // Compute the distance along the ray to each plane
    vec3 t0 = (minBound - ray.pos) / ray.dir;
    vec3 t1 = (maxBound - ray.pos) / ray.dir;

    // Identify candidate entries/exits based on distance from ray.pos
    vec3 entries = min(t0, t1);
    vec3 exits = max(t0, t1);

    vec3 directions = sign(ray.dir);

    // The actual intersection points are the furthest entry and the closest exit
    float lastEntry = maxComponent(entries);
    bvec3 isLastEntry = equal(entries, vec3(lastEntry));
    vec3 entryNormal = -1.0 * vec3(isLastEntry) * directions;
    vec4 entry = vec4(entryNormal, lastEntry);

    float firstExit = minComponent(exits);
    bvec3 isFirstExit = equal(exits, vec3(firstExit));
    vec3 exitNormal = vec3(isLastEntry) * directions;
    vec4 exit = vec4(exitNormal, firstExit);

    if (entry.w > exit.w) {
        entry.w = NO_HIT;
        exit.w = NO_HIT;
    }

    return RayShapeIntersection(entry, exit);
}

void intersectShape(in Ray ray, inout Intersections ix)
{
    RayShapeIntersection intersection = intersectBox(ray, u_renderMinBounds, u_renderMaxBounds);
    setShapeIntersection(ix, BOX_INTERSECTION_INDEX, intersection);
}
