// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, INF_HIT,
// setSurfaceIntersection, setShapeIntersection

/* Cylinder defines (set in Scene/VoxelCylinderShape.js)
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO

#define CYLINDER_INTERSECTION_INDEX_RADIUS_MAX
#define CYLINDER_INTERSECTION_INDEX_RADIUS_MIN
#define CYLINDER_INTERSECTION_INDEX_ANGLE
*/

// Cylinder uniforms
#if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX) || defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT)
    uniform vec3 u_cylinderUvToRenderBoundsScale;
    uniform vec3 u_cylinderUvToRenderBoundsTranslate;
#endif
#if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN) && !defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT)
    uniform float u_cylinderRenderRadiusMin;
#endif
#if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE)
    uniform vec2 u_cylinderRenderAngleMinMax;
#endif

vec4 intersectLongitude(in Ray ray, in float angle, in bool positiveNormal) {
    float normalSign = positiveNormal ? 1.0 : -1.0;
    vec2 planeNormal = vec2(-sin(angle), cos(angle)) * normalSign;

    vec2 position = ray.pos.xy;
    vec2 direction = ray.dir.xy;
    float approachRate = dot(direction, planeNormal);
    float distance = -dot(position, planeNormal);
    
    float t = (approachRate == 0.0)
        ? NO_HIT
        : distance / approachRate;

    return vec4(planeNormal, 0.0, t);
}

RayShapeIntersection intersectHalfSpace(in Ray ray, in float angle, in bool positiveNormal)
{
    vec4 intersection = intersectLongitude(ray, angle, positiveNormal);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);
    
    bool hitFront = (intersection.w > 0.0) == (dot(ray.pos.xy, intersection.xy) > 0.0);
    if (!hitFront) {
        return RayShapeIntersection(intersection, farSide);
    } else {
        return RayShapeIntersection(-1.0 * farSide, intersection);
    }
}

void intersectFlippedWedge(in Ray ray, in vec2 minMaxAngle, out RayShapeIntersection intersections[2])
{
    intersections[0] = intersectHalfSpace(ray, minMaxAngle.x, false);
    intersections[1] = intersectHalfSpace(ray, minMaxAngle.y, true);
}

bool hitPositiveHalfPlane(in Ray ray, in vec4 intersection, in bool positiveNormal) {
    float normalSign = positiveNormal ? 1.0 : -1.0;
    vec2 planeDirection = vec2(intersection.y, -intersection.x) * normalSign;
    vec2 hit = ray.pos.xy + intersection.w * ray.dir.xy;
    return dot(hit, planeDirection) > 0.0;
}

void intersectHalfPlane(in Ray ray, in float angle, out RayShapeIntersection intersections[2]) {
    vec4 intersection = intersectLongitude(ray, angle, true);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    if (hitPositiveHalfPlane(ray, intersection, true)) {
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = vec4(-1.0 * intersection.xy, 0.0, intersection.w);
        intersections[1].entry = intersection;
        intersections[1].exit = farSide;
    } else {
        vec4 miss = vec4(normalize(ray.dir), NO_HIT);
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = farSide;
        intersections[1].entry = miss;
        intersections[1].exit = miss;
    }
}

RayShapeIntersection intersectRegularWedge(in Ray ray, in vec2 minMaxAngle, in bool convex)
{
    // Compute intersections with the two planes
    // TODO: the sign of the normals looks backwards?? But it works for convex == false
    vec4 intersect1 = intersectLongitude(ray, minMaxAngle.x, convex);
    vec4 intersect2 = intersectLongitude(ray, minMaxAngle.y, !convex);

    // Choose intersection with smallest T as the "entry", the other as "exit"
    // Note: entry or exit could be in the "shadow" wedge, beyond the tip
    bool inOrder = intersect1.w <= intersect2.w;
    vec4 entry = inOrder ? intersect1 : intersect2;
    vec4 exit = inOrder ? intersect2 : intersect1;

    bool enterFromOutside = (entry.w >= 0.0) == (dot(ray.pos.xy, entry.xy) < 0.0);
    bool exitFromInside = (exit.w > 0.0) == (dot(ray.pos.xy, exit.xy) >= 0.0);

    float farSideDirection = (convex) ? -1.0 : 1.0;
    vec4 farSide = vec4(normalize(ray.dir) * farSideDirection, INF_HIT);
    vec4 miss = vec4(normalize(ray.dir), NO_HIT);

    if (enterFromOutside && exitFromInside) {
        // Ray crosses both faces of wedge
        return RayShapeIntersection(entry, exit);
    } else if (!enterFromOutside && exitFromInside) {
        // Ray starts inside wedge. exit is in shadow wedge, and entry is actually the exit
        return RayShapeIntersection(-1.0 * farSide, entry);
    } else if (enterFromOutside && !exitFromInside) {
        // First intersection was in the shadow wedge, so exit is actually the entry
        return RayShapeIntersection(exit, farSide);
    } else { // !enterFromOutside && !exitFromInside
        // Both intersections were in the shadow wedge
        return RayShapeIntersection(miss, miss);
    }
}

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

RayShapeIntersection intersectVoxel(in Ray ray, in VoxelBounds voxel)
{
    // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
    // Direction is scaled as well to be in sync with position.
    ray.pos = ray.pos * 2.0 - 1.0;
    ray.dir *= 2.0;

    // VoxelBounds for a cylinder is vec3(radius, height, angle)
    vec3 p0 = convertShapeUvToShapeSpace(voxel.p0);
    vec3 p1 = convertShapeUvToShapeSpace(voxel.p1);

    // Intersect with outer height and radius bounds
    RayShapeIntersection cylinderIntersect = intersectBoundedCylinder(ray, p1.x, vec2(p0.y, p1.y));
    // Intersect with angle bounds
    RayShapeIntersection wedgeIntersect = intersectRegularWedge(ray, vec2(p0.z, p1.z), true);
    // TODO: why is this necessary??
    RayShapeIntersection flippedWedge = invertVolume(wedgeIntersect);
    // Intersection of the two is the pie slice
    RayShapeIntersection pieSlice = intersectIntersections(ray, cylinderIntersect, flippedWedge);

    // Remove the intersection with the inner radius bound
    RayShapeIntersection hole = intersectCylinder(ray, p0.x, false);
    return removeNegativeIntersection(ray, pieSlice, hole);
}

void intersectShape(in Ray ray, inout Intersections ix)
{
    #if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX) || defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT)
        ray.pos = ray.pos * u_cylinderUvToRenderBoundsScale + u_cylinderUvToRenderBoundsTranslate;
        ray.dir *= u_cylinderUvToRenderBoundsScale;
    #else
        // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
        // Direction is scaled as well to be in sync with position.
        ray.pos = ray.pos * 2.0 - 1.0;
        ray.dir *= 2.0;
    #endif

    #if defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT)
        RayShapeIntersection outerIntersect = intersectBoundedCylinder(ray, 1.0, vec2(0.0, 0.0));
    #else
        RayShapeIntersection outerIntersect = intersectBoundedCylinder(ray, 1.0, vec2(-1.0, 1.0));
    #endif

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

        // In theory a similar fix is needed for cylinders with small non-zero
        // thickness. But it's more complicated to implement because the inner
        // shape is allowed to be intersected first.
        RayShapeIntersection innerIntersect = intersectCylinder(ray, 1.0, false);
        setSurfaceIntersection(ix, 0, outerIntersect.entry, true, true);   // positive, enter
        setSurfaceIntersection(ix, 1, innerIntersect.entry, false, true);  // negative, enter
        setSurfaceIntersection(ix, 2, innerIntersect.exit, false, false); // negative, exit
        setSurfaceIntersection(ix, 3, outerIntersect.exit, true, false);  // positive, exit
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN)
        RayShapeIntersection innerIntersect = intersectCylinder(ray, u_cylinderRenderRadiusMin, false);
        setShapeIntersection(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MIN, innerIntersect);
    #endif

    #if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF)
        RayShapeIntersection wedgeIntersect = intersectRegularWedge(ray, u_cylinderRenderAngleMinMax, false);
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
