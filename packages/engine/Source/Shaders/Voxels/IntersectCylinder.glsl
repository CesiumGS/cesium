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
uniform vec2 u_cylinderRenderHeightMinMax;
#if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE)
    uniform vec2 u_cylinderRenderAngleMinMax;
#endif

/**
 * Find the intersection of a ray with the volume defined by two planes of constant z
 */
RayShapeIntersection intersectHeightBounds(in Ray ray, in vec2 minMaxHeight, in bool convex)
{
    float zPosition = ray.pos.z;
    float zDirection = ray.dir.z;

    float tmin = (minMaxHeight.x - zPosition) / zDirection;
    float tmax = (minMaxHeight.y - zPosition) / zDirection;

    // Normals point outside the volume
    float signFlip = convex ? 1.0 : -1.0;
    vec4 intersectMin = vec4(0.0, 0.0, -1.0 * signFlip, tmin);
    vec4 intersectMax = vec4(0.0, 0.0, 1.0 * signFlip, tmax);

    bool topEntry = zDirection < 0.0;
    vec4 entry = topEntry ? intersectMax : intersectMin;
    vec4 exit = topEntry ? intersectMin : intersectMax;

    return RayShapeIntersection(entry, exit);
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
    vec4 intersect1 = vec4(normalize(position + t1 * direction) * signFlip, 0.0, t1);
    vec4 intersect2 = vec4(normalize(position + t2 * direction) * signFlip, 0.0, t2);

    return RayShapeIntersection(intersect1, intersect2);
}

/**
 * Find the intersection of a ray with a right cylindrical solid of given
 * radius and height bounds. NOTE: The shape is assumed to be convex.
 */
RayShapeIntersection intersectBoundedCylinder(in Ray ray, in float radius, in vec2 minMaxHeight)
{
    RayShapeIntersection cylinderIntersection = intersectCylinder(ray, radius, true);
    RayShapeIntersection heightBoundsIntersection = intersectHeightBounds(ray, minMaxHeight, true);
    return intersectIntersections(ray, cylinderIntersection, heightBoundsIntersection);
}

void intersectShape(Ray ray, inout Intersections ix)
{
    // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
    // Direction is scaled as well to be in sync with position.
    ray.pos = ray.pos * 2.0 - 1.0;
    ray.dir *= 2.0;

    RayShapeIntersection outerIntersect = intersectBoundedCylinder(ray, u_cylinderRenderRadiusMinMax.y, u_cylinderRenderHeightMinMax);

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
