//This file is automatically rebuilt by the Cesium build process.
export default "// See IntersectionUtils.glsl for the definitions of Ray and NO_HIT\n\
// See convertUvToBox.glsl for the definition of convertShapeUvToUvSpace\n\
\n\
/* Box defines (set in Scene/VoxelBoxShape.js)\n\
#define BOX_INTERSECTION_INDEX ### // always 0\n\
*/\n\
\n\
uniform vec3 u_renderMinBounds;\n\
uniform vec3 u_renderMaxBounds;\n\
\n\
struct Box {\n\
    vec3 p0;\n\
    vec3 p1;\n\
};\n\
\n\
Box constructVoxelBox(in ivec4 octreeCoords, in vec3 tileUv)\n\
{\n\
    // Find the min/max cornerpoints of the voxel in tile coordinates\n\
    vec3 tileOrigin = vec3(octreeCoords.xyz);\n\
    vec3 numSamples = vec3(u_dimensions);\n\
    vec3 voxelSize = 1.0 / numSamples;\n\
    vec3 coordP0 = floor(tileUv * numSamples) * voxelSize + tileOrigin;\n\
    vec3 coordP1 = coordP0 + voxelSize;\n\
\n\
    // Transform to the UV coordinates of the scaled tileset\n\
    float tileSize = 1.0 / pow(2.0, float(octreeCoords.w));\n\
    vec3 p0 = convertShapeUvToUvSpace(coordP0 * tileSize);\n\
    vec3 p1 = convertShapeUvToUvSpace(coordP1 * tileSize);\n\
\n\
    return Box(p0, p1);\n\
}\n\
\n\
vec3 getBoxNormal(in Box box, in Ray ray, in float t)\n\
{\n\
    vec3 hitPoint = ray.pos + t * ray.dir;\n\
    vec3 lower = step(hitPoint, box.p0);\n\
    vec3 upper = step(box.p1, hitPoint);\n\
    return normalize(upper - lower);\n\
}\n\
\n\
// Find the distances along a ray at which the ray intersects an axis-aligned box\n\
// See https://tavianator.com/2011/ray_box.html\n\
RayShapeIntersection intersectBox(in Ray ray, in Box box)\n\
{\n\
    // Consider the box as the intersection of the space between 3 pairs of parallel planes\n\
    // Compute the distance along the ray to each plane\n\
    vec3 t0 = (box.p0 - ray.pos) * ray.dInv;\n\
    vec3 t1 = (box.p1 - ray.pos) * ray.dInv;\n\
\n\
    // Identify candidate entries/exits based on distance from ray.pos\n\
    vec3 entries = min(t0, t1);\n\
    vec3 exits = max(t0, t1);\n\
\n\
    // The actual box intersection points are the furthest entry and the closest exit\n\
    float entryT = max(max(entries.x, entries.y), entries.z);\n\
    float exitT = min(min(exits.x, exits.y), exits.z);\n\
\n\
    vec3 entryNormal = getBoxNormal(box, ray, entryT - RAY_SHIFT);\n\
    vec3 exitNormal = getBoxNormal(box, ray, exitT + RAY_SHIFT);\n\
\n\
    if (entryT > exitT) {\n\
        entryT = NO_HIT;\n\
        exitT = NO_HIT;\n\
    }\n\
\n\
    return RayShapeIntersection(vec4(entryNormal, entryT), vec4(exitNormal, exitT));\n\
}\n\
\n\
void intersectShape(in Ray ray, inout Intersections ix)\n\
{\n\
    RayShapeIntersection intersection = intersectBox(ray, Box(u_renderMinBounds, u_renderMaxBounds));\n\
    setShapeIntersection(ix, BOX_INTERSECTION_INDEX, intersection);\n\
}\n\
";
