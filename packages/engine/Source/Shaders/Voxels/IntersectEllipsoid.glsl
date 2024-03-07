// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, INF_HIT, Intersections,
// RayShapeIntersection, setSurfaceIntersection, setShapeIntersection
// See IntersectLongitude.glsl for the definitions of intersectHalfPlane,
// intersectFlippedWedge, intersectRegularWedge

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
uniform float u_eccentricitySquared;
uniform vec2 u_ellipsoidRenderLatitudeSinMinMax;
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

RayShapeIntersection intersectHeight(in Ray ray, in float relativeHeight, in bool convex)
{
    // Scale the ray by the ellipsoid axes to make it a unit sphere
    // Note: approximating ellipsoid + height as an ellipsoid
    vec3 radiiCorrection = u_ellipsoidRadiiUv / (u_ellipsoidRadiiUv + relativeHeight);
    vec3 position = ray.pos * radiiCorrection;
    vec3 direction = ray.dir * radiiCorrection;

    float a = dot(direction, direction); // ~ 1.0 (or maybe 4.0 if ray is scaled)
    float b = dot(direction, position); // roughly inside [-1.0, 1.0] when zoomed in
    float c = dot(position, position) - 1.0; // ~ 0.0 when zoomed in.
    float determinant = b * b - a * c; // ~ b * b when zoomed in

    if (determinant < 0.0) {
        vec4 miss = vec4(normalize(direction), NO_HIT);
        return RayShapeIntersection(miss, miss);
    }

    determinant = sqrt(determinant);

    // Compute larger root using standard formula
    float signB = b < 0.0 ? -1.0 : 1.0;
    // The other root may suffer from subtractive cancellation in the standard formula.
    // Compute it from the first root instead.
    float t1 = (-b - signB * determinant) / a;
    float t2 = c / (a * t1);
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);

    float directionScale = convex ? 1.0 : -1.0;
    vec3 d1 = directionScale * normalize(position + tmin * direction);
    vec3 d2 = directionScale * normalize(position + tmax * direction);

    return RayShapeIntersection(vec4(d1, tmin), vec4(d2, tmax));
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

    float aSin = d.z * d.z * sinSqrHalfAngle;
    float aCos = -dot(d.xy, d.xy) * cosSqrHalfAngle;
    float a = aSin + aCos;

    float bSin = d.z * o.z * sinSqrHalfAngle;
    float bCos = -dot(o.xy, d.xy) * cosSqrHalfAngle;
    float b = bSin + bCos;

    float cSin = o.z * o.z * sinSqrHalfAngle;
    float cCos = -dot(o.xy, o.xy) * cosSqrHalfAngle;
    float c = cSin + cCos;
    // determinant = b * b - a * c. But bSin * bSin = aSin * cSin.
    // Avoid subtractive cancellation by expanding to eliminate these terms
    float determinant = 2.0 * bSin * bCos + bCos * bCos - aSin * cCos - aCos * cSin - aCos * cCos;

    if (determinant < 0.0) {
        return vec2(NO_HIT);
    } else if (a == 0.0) {
        // Ray is parallel to cone surface
        return (b == 0.0)
            ? vec2(NO_HIT) // Ray is on cone surface
            : vec2(-0.5 * c / b, NO_HIT);
    }

    determinant = sqrt(determinant);

    // Compute larger root using standard formula
    float signB = b < 0.0 ? -1.0 : 1.0;
    float t1 = (-b - signB * determinant) / a;
    // The other root may suffer from subtractive cancellation in the standard formula.
    // Compute it from the first root instead.
    float t2 = c / (a * t1);
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

/**
 * Compute the shift between the ellipsoid origin and the apex of a cone of latitude
 */
float getLatitudeConeShift(in float sinLatitude) {
    // Find prime vertical radius of curvature: 
    // the distance along the ellipsoid normal to the intersection with the z-axis
    float x2 = u_eccentricitySquared * sinLatitude * sinLatitude;
    float primeVerticalRadius = inversesqrt(1.0 - x2);

    // Compute a shift from the origin to the intersection of the cone with the z-axis
    return primeVerticalRadius * u_eccentricitySquared * sinLatitude;
}

void intersectFlippedCone(in Ray ray, in float cosHalfAngle, out RayShapeIntersection intersections[2]) {
    // Undo the scaling from ellipsoid to sphere
    ray.pos = ray.pos * u_ellipsoidRadiiUv;
    ray.dir = ray.dir * u_ellipsoidRadiiUv;
    // Shift the ray to account for the latitude cone not being centered at the Earth center
    ray.pos.z += getLatitudeConeShift(cosHalfAngle);

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
    // Undo the scaling from ellipsoid to sphere
    ray.pos = ray.pos * u_ellipsoidRadiiUv;
    ray.dir = ray.dir * u_ellipsoidRadiiUv;
    // Shift the ray to account for the latitude cone not being centered at the Earth center
    ray.pos.z += getLatitudeConeShift(cosHalfAngle);

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
    RayShapeIntersection outerIntersect = intersectHeight(ray, u_clipMinMaxHeight.y, true);
    setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX, outerIntersect);

    // Exit early if the outer ellipsoid was missed.
    if (outerIntersect.entry.w == NO_HIT) {
        return;
    }

    // Inner ellipsoid
    RayShapeIntersection innerIntersect = intersectHeight(ray, u_clipMinMaxHeight.x, false);

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
        setSurfaceIntersection(ix, 0, outerIntersect.entry, true, true);  // positive, enter
        setSurfaceIntersection(ix, 1, innerIntersect.entry, false, true); // negative, enter
        setSurfaceIntersection(ix, 2, innerIntersect.exit, false, false); // negative, exit
        setSurfaceIntersection(ix, 3, outerIntersect.exit, true, false);  // positive, exit
    }

    // Bottom cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF)
        RayShapeIntersection bottomConeIntersection = intersectRegularCone(ray, u_ellipsoidRenderLatitudeSinMinMax.x, false);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF)
        RayShapeIntersection bottomConeIntersection = intersectZPlane(ray, -1.0);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF)
        RayShapeIntersection bottomConeIntersections[2];
        intersectFlippedCone(ray, u_ellipsoidRenderLatitudeSinMinMax.x, bottomConeIntersections);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 0, bottomConeIntersections[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 1, bottomConeIntersections[1]);
    #endif

    // Top cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF)
        RayShapeIntersection topConeIntersections[2];
        intersectFlippedCone(ray, u_ellipsoidRenderLatitudeSinMinMax.y, topConeIntersections);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 0, topConeIntersections[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 1, topConeIntersections[1]);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF)
        RayShapeIntersection topConeIntersection = intersectZPlane(ray, 1.0);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF)
        RayShapeIntersection topConeIntersection = intersectRegularCone(ray, u_ellipsoidRenderLatitudeSinMinMax.y, false);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
    #endif

    // Wedge
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO)
        RayShapeIntersection wedgeIntersects[2];
        intersectHalfPlane(ray, u_ellipsoidRenderLongitudeMinMax.x, wedgeIntersects);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 1, wedgeIntersects[1]);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF)
        RayShapeIntersection wedgeIntersect = intersectRegularWedge(ray, u_ellipsoidRenderLongitudeMinMax);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE, wedgeIntersect);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF)
        RayShapeIntersection wedgeIntersects[2];
        intersectFlippedWedge(ray, u_ellipsoidRenderLongitudeMinMax, wedgeIntersects);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 1, wedgeIntersects[1]);
    #endif
}
