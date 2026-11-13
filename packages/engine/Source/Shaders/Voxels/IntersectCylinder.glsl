// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, Intersections,
// RayShapeIntersection, setSurfaceIntersection, setShapeIntersection,
// intersectIntersections
// See IntersectLongitude.glsl for the definitions of intersectHalfPlane,
// intersectFlippedWedge, intersectRegularWedge

/* Cylinder defines (set in Scene/VoxelCylinderShape.js)
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO

#define CYLINDER_INTERSECTION_INDEX_RADIUS_MAX
#define CYLINDER_INTERSECTION_INDEX_RADIUS_MIN
#define CYLINDER_INTERSECTION_INDEX_ANGLE
*/

// Cylinder uniforms
uniform vec2 u_cylinderRenderRadiusMinMax;
#if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE)
    uniform vec2 u_cylinderRenderAngleMinMax;
#endif

uniform sampler2D u_renderBoundPlanesTexture;

RayShapeIntersection intersectBoundPlanes(in Ray ray) {
    vec4 lastEntry = vec4(ray.dir, -INF_HIT);
    vec4 firstExit = vec4(-ray.dir, +INF_HIT);
    for (int i = 0; i < 2; i++) {
        vec4 boundPlane = getBoundPlane(u_renderBoundPlanesTexture, i);
        vec4 intersection = intersectPlane(ray, boundPlane);
        if (dot(ray.dir, boundPlane.xyz) < 0.0) {
            lastEntry = intersection.w > lastEntry.w ? intersection : lastEntry;
        } else {
            firstExit = intersection.w < firstExit.w ? intersection: firstExit;
        }
    }

    if (lastEntry.w < firstExit.w) {
        return RayShapeIntersection(lastEntry, firstExit);
    } else {
        return RayShapeIntersection(vec4(-ray.dir, NO_HIT), vec4(ray.dir, NO_HIT));
    }
}

/**
 * Find the intersection of a ray with a right cylindrical surface of a given radius
 * about the z-axis.
 */
RayShapeIntersection intersectCylinder(in Ray ray, in float radius, in bool convex)
{
    vec2 position = ray.pos.xy;
    vec2 direction = ray.dir.xy;

    float a = dot(direction, direction);
    float b = dot(position, direction);
    float c = dot(position, position) - radius * radius;
    float determinant = b * b - a * c;

    if (determinant < 0.0) {
        vec4 miss = vec4(normalize(ray.dir), NO_HIT);
        return RayShapeIntersection(miss, miss);
    }

    determinant = sqrt(determinant);
    float t1 = (-b - determinant) / a;
    float t2 = (-b + determinant) / a;
    float signFlip = convex ? 1.0 : -1.0;
    vec3 normal1 = vec3((position + t1 * direction) * signFlip, 0.0);
    vec3 normal2 = vec3((position + t2 * direction) * signFlip, 0.0);
    // Return normals in eye coordinates
    vec4 intersect1 = vec4(normalize(czm_normal * normal1), t1);
    vec4 intersect2 = vec4(normalize(czm_normal * normal2), t2);

    return RayShapeIntersection(intersect1, intersect2);
}

/**
 * Find the intersection of a ray with a right cylindrical solid of given
 * radius and height bounds. NOTE: The shape is assumed to be convex.
 */
RayShapeIntersection intersectBoundedCylinder(in Ray ray, in Ray rayEC, in float radius)
{
    RayShapeIntersection cylinderIntersection = intersectCylinder(ray, radius, true);
    RayShapeIntersection heightBoundsIntersection = intersectBoundPlanes(rayEC);
    return intersectIntersections(ray, cylinderIntersection, heightBoundsIntersection);
}

void intersectShape(in Ray ray, in Ray rayEC, inout Intersections ix)
{
    RayShapeIntersection outerIntersect = intersectBoundedCylinder(ray, rayEC, u_cylinderRenderRadiusMinMax.y);

    setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MAX, outerIntersect);

    if (outerIntersect.entry.w == NO_HIT) {
        return;
    }

    #if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT)
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

        // Note: If initializeIntersections() changes its sorting function
        // from bubble sort to something else, this code may need to change.
        RayShapeIntersection innerIntersect = intersectCylinder(ray, 1.0, false);
        setSurfaceIntersection(ix, 0, outerIntersect.entry, true, true);  // positive, enter
        setSurfaceIntersection(ix, 1, innerIntersect.entry, false, true); // negative, enter
        setSurfaceIntersection(ix, 2, innerIntersect.exit, false, false); // negative, exit
        setSurfaceIntersection(ix, 3, outerIntersect.exit, true, false);  // positive, exit
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN)
        RayShapeIntersection innerIntersect = intersectCylinder(ray, u_cylinderRenderRadiusMinMax.x, false);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MIN, innerIntersect);
    #endif

    #if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF)
        RayShapeIntersection wedgeIntersect = intersectRegularWedge(ray, u_cylinderRenderAngleMinMax);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_ANGLE, wedgeIntersect);
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF)
        RayShapeIntersection wedgeIntersects[2];
        intersectFlippedWedge(ray, u_cylinderRenderAngleMinMax, wedgeIntersects);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersects[1]);
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO)
        RayShapeIntersection wedgeIntersects[2];
        intersectHalfPlane(ray, u_cylinderRenderAngleMinMax.x, wedgeIntersects);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersects[1]);
    #endif
}
