// See IntersectionUtils.glsl for the definitions of Ray, RayShapeIntersection,
// NO_HIT, Intersections

/* Box defines (set in Scene/VoxelBoxShape.js)
#define BOX_INTERSECTION_INDEX ### // always 0
*/

uniform sampler2D u_renderBoundPlanesTexture;

RayShapeIntersection intersectBoundPlanes(in Ray ray) {
    // Transform from [0,1] UV space to [-1,1] shape space.

    vec4 lastEntry = vec4(ray.dir, -INF_HIT);
    vec4 firstExit = vec4(-ray.dir, +INF_HIT);
    for (int i = 0; i < 6; i++) {
        vec4 boundPlane = getBoundPlane(u_renderBoundPlanesTexture, i);
        vec4 intersection = intersectPlane(ray, boundPlane);
        if (dot(ray.dir, boundPlane.xyz) < 0.0) {
            // TODO: use intersectionMax?
            lastEntry = intersection.w > lastEntry.w ? intersection : lastEntry;
        } else {
            // TODO: use intersectionMin?
            firstExit = intersection.w < firstExit.w ? intersection: firstExit;
        }
    }

    // Temporary: transform normal from eye to model coordinates. TODO: remove this
    lastEntry.xyz = normalize(czm_inverseNormal * lastEntry.xyz);

    if (lastEntry.w < firstExit.w) {
        return RayShapeIntersection(lastEntry, firstExit);
    } else {
        return RayShapeIntersection(vec4(-ray.dir, NO_HIT), vec4(ray.dir, NO_HIT));
    }
}

void intersectShape(in Ray ray, inout Intersections ix)
{
    RayShapeIntersection intersection = intersectBoundPlanes(ray);
    setShapeIntersection(ix, BOX_INTERSECTION_INDEX, intersection);
}
