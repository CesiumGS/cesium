// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, INF_HIT, Intersections,
// RayShapeIntersection, setSurfaceIntersection, setShapeIntersection, setIntersectionPair
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
#if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF)
    uniform vec2 u_ellipsoidRenderLatitudeCosSqrHalfMinMax;
#endif
uniform vec2 u_clipMinMaxHeight;

vec2 intersectZPlane(Ray ray)
{
    float o = ray.pos.z;
    float d = ray.dir.z;
    float t = -o / d;
    float s = sign(o);

    if (t >= 0.0 != s >= 0.0) return vec2(t, +INF_HIT);
    else return vec2(-INF_HIT, t);
}

RayShapeIntersection intersectHeight(in Ray ray, in float relativeHeight, in bool convex)
{
    // Scale the ray by the ellipsoid axes to make it a unit sphere
    // Note: approximating ellipsoid + height as an ellipsoid
    // Note: may be better to approximate radiiCorrection for small relative heights
    vec3 radiiCorrection = u_ellipsoidRadiiUv / (u_ellipsoidRadiiUv + relativeHeight);
    vec3 position = ray.pos * radiiCorrection;
    vec3 direction = ray.dir * radiiCorrection;

    float a = dot(direction, direction); // ~ 1.0 (or maybe 4.0 if ray is scaled)
    float b = dot(direction, position); // roughly inside [-1.0, 1.0] when zoomed in
    float c = dot(position, position) - 1.0; // ~ 0.0 when zoomed in. Note cancellation problem!
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

vec2 intersectDoubleEndedCone(Ray ray, float cosSqrHalfAngle)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float a = d.z * d.z - dot(d, d) * cosSqrHalfAngle;
    float b = d.z * o.z - dot(o, d) * cosSqrHalfAngle;
    float c = o.z * o.z - dot(o, o) * cosSqrHalfAngle;
    float det = b * b - a * c;

    if (det < 0.0) {
        return vec2(NO_HIT);
    }

    det = sqrt(det);
    float t1 = (-b - det) / a;
    float t2 = (-b + det) / a;
    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    return vec2(tmin, tmax);
}

vec4 intersectFlippedCone(Ray ray, float cosSqrHalfAngle) {
    vec2 intersect = intersectDoubleEndedCone(ray, cosSqrHalfAngle);

    if (intersect.x == NO_HIT) {
        return vec4(-INF_HIT, +INF_HIT, NO_HIT, NO_HIT);
    }

    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float tmin = intersect.x;
    float tmax = intersect.y;
    float zmin = o.z + tmin * d.z;
    float zmax = o.z + tmax * d.z;

    // One interval
    if (zmin < 0.0 && zmax < 0.0) return vec4(-INF_HIT, +INF_HIT, NO_HIT, NO_HIT);
    else if (zmin < 0.0) return vec4(-INF_HIT, tmax, NO_HIT, NO_HIT);
    else if (zmax < 0.0) return vec4(tmin, +INF_HIT, NO_HIT, NO_HIT);
    // Two intervals
    else return vec4(-INF_HIT, tmin, tmax, +INF_HIT);
}

vec2 intersectRegularCone(Ray ray, float cosSqrHalfAngle) {
    vec2 intersect = intersectDoubleEndedCone(ray, cosSqrHalfAngle);

    if (intersect.x == NO_HIT) {
        return vec2(NO_HIT);
    }

    vec3 o = ray.pos;
    vec3 d = ray.dir;
    float tmin = intersect.x;
    float tmax = intersect.y;
    float zmin = o.z + tmin * d.z;
    float zmax = o.z + tmax * d.z;

    if (zmin < 0.0 && zmax < 0.0) return vec2(NO_HIT);
    else if (zmin < 0.0) return vec2(tmax, +INF_HIT);
    else if (zmax < 0.0) return vec2(-INF_HIT, tmin);
    else return vec2(tmin, tmax);
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

    // Flip the ray because the intersection function expects a cone growing towards +Z.
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF) || defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF)
        Ray flippedRay = ray;
        flippedRay.dir.z *= -1.0;
        flippedRay.pos.z *= -1.0;
    #endif

    // Bottom cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF)
        vec2 bottomConeIntersection = intersectRegularCone(flippedRay, u_ellipsoidRenderLatitudeCosSqrHalfMinMax.x);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF)
        vec2 bottomConeIntersection = intersectZPlane(flippedRay);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN, bottomConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF)
        vec4 bottomConeIntersection = intersectFlippedCone(ray, u_ellipsoidRenderLatitudeCosSqrHalfMinMax.x);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 0, bottomConeIntersection.xy);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN + 1, bottomConeIntersection.zw);
    #endif

    // Top cone
    #if defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF)
        vec4 topConeIntersection = intersectFlippedCone(flippedRay, u_ellipsoidRenderLatitudeCosSqrHalfMinMax.y);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 0, topConeIntersection.xy);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX + 1, topConeIntersection.zw);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF)
        vec2 topConeIntersection = intersectZPlane(ray);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
    #elif defined(ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF)
        vec2 topConeIntersection = intersectRegularCone(ray, u_ellipsoidRenderLatitudeCosSqrHalfMinMax.y);
        setIntersectionPair(ix, ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX, topConeIntersection);
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
        intersectFlippedWedge(ray, u_ellipsoidRenderLongitudeMinMax, wedgeIntersects);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 0, wedgeIntersects[0]);
        setShapeIntersection(ix, ELLIPSOID_INTERSECTION_INDEX_LONGITUDE + 1, wedgeIntersects[1]);
    #endif
}
