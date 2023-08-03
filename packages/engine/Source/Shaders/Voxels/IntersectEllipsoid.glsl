// See IntersectionUtils.glsl for the definitions of Ray, Intersections,
// RayShapeIntersection, setShapeIntersection, INF_HIT, NO_HIT

/* Ellipsoid defines (set in Scene/VoxelEllipsoidShape.js)
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF
#define ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF
#define ELLIPSOID_INTERSECTION_INDEX_LONGITUDE
#define ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX
#define ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN
#define ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX
#define ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN
*/

#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE)
    uniform vec2 u_ellipsoidRenderLongitudeMinMax;
#endif
uniform vec2 u_ellipsoidRenderLatitudeCosHalfMinMax;
uniform vec2 u_clipMinMaxHeight;

RayShapeIntersection intersectZPlane(in Ray ray, in float z) {
    float t = -ray.pos.z / ray.dir.z;

    bool startsOutside = sign(ray.pos.z) == sign(z);
    bool entry = (t >= 0.0) != startsOutside;

    vec4 intersect = vec4(0.0, 0.0, z, t);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    if (entry) {
        return RayShapeIntersection(intersect, farSide);
    } else {
        return RayShapeIntersection(-1.0 * farSide, intersect);
    }
}

vec4 intersectLongitude(in Ray ray, in float angle) {
    vec2 planeNormal = vec2(-sin(angle), cos(angle));

    vec2 position = ray.pos.xy;
    vec2 direction = ray.dir.xy;
    float t = -dot(position, planeNormal) / dot(direction, planeNormal);

    return vec4(planeNormal, 0.0, t);
}

bool hitPositiveHalfPlane(in Ray ray, in vec4 intersection) {
    vec2 planeDirection = vec2(intersection.y, -intersection.x);
    vec2 hit = ray.pos.xy + intersection.w * ray.dir.xy;
    return dot(hit, planeDirection) >= 0.0;
}

void intersectHalfPlane(in Ray ray, in float angle, out RayShapeIntersection intersections[2]) {
    vec4 intersection = intersectLongitude(ray, angle);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    if (hitPositiveHalfPlane(ray, intersection)) {
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

RayShapeIntersection intersectHalfSpace(in Ray ray, in float angle)
{
    vec4 intersection = intersectLongitude(ray, angle);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);
    
    bool hitFront = (intersection.w > 0.0) == (dot(ray.pos.xy, intersection.xy) >= 0.0);
    if (!hitFront) {
        return RayShapeIntersection(intersection, farSide);
    } else {
        return RayShapeIntersection(-1.0 * farSide, intersection);
    }
}

RayShapeIntersection intersectRegularWedge(in Ray ray, in vec2 minMaxAngle, in bool convex)
{
    // Compute intersections with the two planes
    float minAngle = (convex) ? minMaxAngle.x : minMaxAngle.x + czm_pi;
    float maxAngle = (convex) ? minMaxAngle.y + czm_pi : minMaxAngle.y;
    vec4 intersect1 = intersectLongitude(ray, minAngle);
    vec4 intersect2 = intersectLongitude(ray, maxAngle);

    // Choose intersection with smallest T as the "entry", the other as "exit"
    // Note: entry or exit could be in the "shadow" wedge, beyond the tip
    bool inOrder = intersect1.w <= intersect2.w;
    vec4 entry = inOrder ? intersect1 : intersect2;
    vec4 exit = inOrder ? intersect2 : intersect1;

    bool enterFromOutside = (entry.w >= 0.0) == (dot(ray.pos.xy, entry.xy) < 0.0);
    bool exitFromInside = (exit.w >= 0.0) == (dot(ray.pos.xy, exit.xy) >= 0.0);

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

void intersectFlippedWedge(in Ray ray, in float minAngle, in float maxAngle, out RayShapeIntersection intersections[2])
{
    intersections[0] = intersectHalfSpace(ray, minAngle + czm_pi);
    intersections[1] = intersectHalfSpace(ray, maxAngle);
}

/**
 * relativeHeight is a ratio relative to ellipsoid radius, i.e.,  height / shapeMaxExtent
 */
RayShapeIntersection intersectSphere(in Ray ray, in float relativeHeight, in bool convex)
{
    vec3 position = ray.pos;
    vec3 direction = ray.dir;

    float radius = 1.0 + relativeHeight; // Cancellation! (for small relativeHeight)
    float a = dot(direction, direction);
    float b = dot(direction, position);
    float c = dot(position, position) - radius * radius; // Cancellation! (if length(ray.pos) - 1.0 ~ relativeHeight)
    float determinant = b * b - a * c; // Possible cancellation!

    if (determinant < 0.0) {
        vec4 miss = vec4(normalize(direction), NO_HIT);
        return RayShapeIntersection(miss, miss);
    }

    determinant = sqrt(determinant);
    float t1 = (-b - determinant) / a; // Possible cancellation for small relativeHeight?
    float t2 = (-b + determinant) / a;

    float tmin = min(t1, t2);
    float tmax = max(t1, t2);

    float directionScale = convex ? 1.0 : -1.0;
    vec3 dmin = directionScale * normalize(position + tmin * direction);
    vec3 dmax = directionScale * normalize(position + tmax * direction);

    return RayShapeIntersection(vec4(dmin, tmin), vec4(dmax, tmax));
}

/**
 * Given a circular cone around the z-axis, with apex at the origin,
 * find the parametric distance(s) along a ray where that ray intersects
 * the cone.
 * The cone opening angle is described by the squared cosine of
 * its half-angle (the angle between the Z-axis and the surface)
 */
vec2 intersectDoubleEndedCone(in Ray ray, in float cosSqrHalfAngle)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float sinSqrHalfAngle = 1.0 - cosSqrHalfAngle;
    // a = d.z * d.z - dot(d, d) * cosSqrHalfAngle;
    float aSin = d.z * d.z * sinSqrHalfAngle;
    float aCos = -dot(d.xy, d.xy) * cosSqrHalfAngle;
    float a = aSin + aCos;
    // b = d.z * o.z - dot(o, d) * cosSqrHalfAngle;
    float bSin = d.z * o.z * sinSqrHalfAngle;
    float bCos = -dot(o.xy, d.xy) * cosSqrHalfAngle;
    float b = bSin + bCos;
    // c = o.z * o.z - dot(o, o) * cosSqrHalfAngle;
    float cSin = o.z * o.z * sinSqrHalfAngle;
    float cCos = -dot(o.xy, o.xy) * cosSqrHalfAngle;
    float c = cSin + cCos;
    // determinant = b * b - a * c. But bSin * bSin = aSin * cSin.
    // Avoid subtractive cancellation by expanding to eliminate these terms
    float det = 2.0 * bSin * bCos + bCos * bCos - aSin * cCos - aCos * cSin - aCos * cCos;

    if (det < 0.0) {
        return vec2(NO_HIT);
    } else if (a == 0.0) {
        // Ray is parallel to cone surface
        return (b == 0.0)
            ? vec2(NO_HIT) // Ray is on cone surface
            : vec2(-0.5 * c / b, NO_HIT);
    }

    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    return vec2(tmin, tmax);
}

/**
 * Given a point on a conical surface, find the surface normal at that point.
 */
vec3 getConeNormal(in vec3 p, in bool convex) {
    // Start with radial component pointing toward z-axis
    vec2 radial = -abs(p.z) * normalize(p.xy);
    // Z component points toward opening of cone
    float zSign = (p.z < 0.0) ? -1.0 : 1.0;
    float z = length(p.xy) * zSign;
    // Flip normal if shape is convex
    float flip = (convex) ? -1.0 : 1.0;
    return normalize(vec3(radial, z) * flip);
}

void intersectFlippedCone(in Ray ray, in float cosHalfAngle, out RayShapeIntersection intersections[2]) {
    float cosSqrHalfAngle = cosHalfAngle * cosHalfAngle;
    vec2 intersect = intersectDoubleEndedCone(ray, cosSqrHalfAngle);

    vec4 miss = vec4(normalize(ray.dir), NO_HIT);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    // Initialize output with no intersections
    intersections[0].entry = -1.0 * farSide;
    intersections[0].exit = farSide;
    intersections[1].entry = miss;
    intersections[1].exit = miss;

    if (intersect.x == NO_HIT) {
        return;
    }

    // Find the points of intersection
    float tmin = intersect.x;
    float tmax = intersect.y;
    vec3 p0 = ray.pos + tmin * ray.dir;
    vec3 p1 = ray.pos + tmax * ray.dir;

    vec4 intersect0 = vec4(getConeNormal(p0, true), tmin);
    vec4 intersect1 = vec4(getConeNormal(p1, true), tmax);

    bool p0InShadowCone = sign(p0.z) != sign(cosHalfAngle);
    bool p1InShadowCone = sign(p1.z) != sign(cosHalfAngle);

    if (p0InShadowCone && p1InShadowCone) {
        // no valid intersections
    } else if (p0InShadowCone) {
        intersections[0].exit = intersect1;
    } else if (p1InShadowCone) {
        intersections[0].entry = intersect0;
    } else {
        intersections[0].exit = intersect0;
        intersections[1].entry = intersect1;
        intersections[1].exit = farSide;
    }
}

RayShapeIntersection intersectRegularCone(in Ray ray, in float cosHalfAngle, in bool convex) {
    float cosSqrHalfAngle = cosHalfAngle * cosHalfAngle;
    vec2 intersect = intersectDoubleEndedCone(ray, cosSqrHalfAngle);

    vec4 miss = vec4(normalize(ray.dir), NO_HIT);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    if (intersect.x == NO_HIT) {
        return RayShapeIntersection(miss, miss);
    }

    // Find the points of intersection
    float tmin = intersect.x;
    float tmax = intersect.y;
    vec3 p0 = ray.pos + tmin * ray.dir;
    vec3 p1 = ray.pos + tmax * ray.dir;

    vec4 intersect0 = vec4(getConeNormal(p0, convex), tmin);
    vec4 intersect1 = vec4(getConeNormal(p1, convex), tmax);

    bool p0InShadowCone = sign(p0.z) != sign(cosHalfAngle);
    bool p1InShadowCone = sign(p1.z) != sign(cosHalfAngle);

    if (p0InShadowCone && p1InShadowCone) {
        return RayShapeIntersection(miss, miss);
    } else if (p0InShadowCone) {
        return RayShapeIntersection(intersect1, farSide);
    } else if (p1InShadowCone) {
        return RayShapeIntersection(-1.0 * farSide, intersect0);
    } else {
        return RayShapeIntersection(intersect0, intersect1);
    }
}

void intersectShape(in Ray ray, inout Intersections ix) {
    // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
    // Direction is scaled as well to be in sync with position.
    ray.pos = ray.pos * 2.0 - 1.0;
    ray.dir *= 2.0;

    // Outer ellipsoid
    RayShapeIntersection outerIntersect = intersectSphere(ray, u_clipMinMaxHeight.y, true);
    setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX, outerIntersect);

    // Exit early if the outer ellipsoid was missed.
    if (outerIntersect.entry.w == NO_HIT) {
        return;
    }

    // Inner ellipsoid
    RayShapeIntersection innerIntersect = intersectSphere(ray, u_clipMinMaxHeight.x, false);

    if (innerIntersect.entry.w == NO_HIT) {
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN, innerIntersect);
    } else {
        // When the ellipsoid is large and thin it's possible for floating point math
        // to cause the ray to intersect the inner ellipsoid before the outer ellipsoid. 
        // To prevent this from happening, clamp innerIntersect to outerIntersect and
        // sandwich the inner ellipsoid intersection inside the outer ellipsoid intersection.

        // Without this special case,
        // [outerMin, outerMax, innerMin, innerMax] will bubble sort to
        // [outerMin, innerMin, outerMax, innerMax] which will cause the back
        // side of the ellipsoid to be invisible because it will think the ray
        // is still inside the inner (negative) ellipsoid after exiting the
        // outer (positive) ellipsoid.

        // With this special case,
        // [outerMin, innerMin, innerMax, outerMax] will bubble sort to
        // [outerMin, innerMin, innerMax, outerMax] which will work correctly.

        // Note: If initializeIntersections() changes its sorting function
        // from bubble sort to something else, this code may need to change.
        innerIntersect.entry.w = max(innerIntersect.entry.w, outerIntersect.entry.w);
        innerIntersect.exit.w = min(innerIntersect.exit.w, outerIntersect.exit.w);
        setSurfaceIntersection(ix, 0, outerIntersect.entry, true, true);   // positive, enter
        setSurfaceIntersection(ix, 1, innerIntersect.entry, false, true);  // negative, enter
        setSurfaceIntersection(ix, 2, innerIntersect.exit, false, false); // negative, exit
        setSurfaceIntersection(ix, 3, outerIntersect.exit, true, false);  // positive, exit
    }

    // Bottom cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF)
        RayShapeIntersection bottomConeIntersection = intersectRegularCone(ray, u_ellipsoidRenderLatitudeCosHalfMinMax.x, false);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF)
        RayShapeIntersection bottomConeIntersection = intersectZPlane(ray, -1.0);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF)
        RayShapeIntersection bottomConeIntersections[2];
        intersectFlippedCone(ray, u_ellipsoidRenderLatitudeCosHalfMinMax.x, bottomConeIntersections);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 0, bottomConeIntersections[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 1, bottomConeIntersections[1]);
    #endif

    // Top cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF)
        RayShapeIntersection topConeIntersections[2];
        intersectFlippedCone(ray, u_ellipsoidRenderLatitudeCosHalfMinMax.y, topConeIntersections);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 0, topConeIntersections[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 1, topConeIntersections[1]);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF)
        RayShapeIntersection topConeIntersection = intersectZPlane(ray, 1.0);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF)
        RayShapeIntersection topConeIntersection = intersectRegularCone(ray, u_ellipsoidRenderLatitudeCosHalfMinMax.y, false);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
    #endif

    // Wedge
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO)
        RayShapeIntersection wedgeIntersects[2];
        intersectHalfPlane(ray, u_ellipsoidRenderLongitudeMinMax.x, wedgeIntersects);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 1, wedgeIntersects[1]);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF)
        RayShapeIntersection wedgeIntersect = intersectRegularWedge(ray, u_ellipsoidRenderLongitudeMinMax, false);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE, wedgeIntersect);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF)
        RayShapeIntersection wedgeIntersects[2];
        intersectFlippedWedge(ray, u_ellipsoidRenderLongitudeMinMax.x, u_ellipsoidRenderLongitudeMinMax.y, wedgeIntersects);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 1, wedgeIntersects[1]);
    #endif
}
