// import { Ray, setIntersection, setIntersectionPair } from "./IntersectionUtils.glsl";

/* Cylinder defines:
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_HALF
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_ZERO

#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS_FLAT
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT_FLAT
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_RANGE_ZERO
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED

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
    uniform float u_cylinderUvToRenderRadiusMin;
#endif
#if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE)
    uniform vec2 u_cylinderRenderAngleMinMax;
#endif

vec4 intersectHalfPlane(Ray ray, float angle) {
    vec2 o = ray.pos.xy;
    vec2 d = ray.dir.xy;
    vec2 planeDirection = vec2(cos(angle), sin(angle));
    vec2 planeNormal = vec2(planeDirection.y, -planeDirection.x);

    float a = dot(o, planeNormal);
    float b = dot(d, planeNormal);
    float t = -a / b;

    vec2 p = o + t * d;
    bool outside = dot(p, planeDirection) < 0.0;
    if (outside) return vec4(-INF_HIT, +INF_HIT, NO_HIT, NO_HIT);
    
    return vec4(-INF_HIT, t, t, +INF_HIT);
}

vec2 intersectHalfSpace(Ray ray, float angle)
{    
    vec2 o = ray.pos.xy;
    vec2 d = ray.dir.xy;
    vec2 n = vec2(sin(angle), -cos(angle));
    
    float a = dot(o, n);
    float b = dot(d, n);
    float t = -a / b;
    float s = sign(a);

    if (t >= 0.0 != s >= 0.0) return vec2(t, +INF_HIT);
    else return vec2(-INF_HIT, t);
}

vec2 intersectRegularWedge(Ray ray, float minAngle, float maxAngle)
{    
    vec2 o = ray.pos.xy;
    vec2 d = ray.dir.xy;
    vec2 n1 = vec2(sin(minAngle), -cos(minAngle));
    vec2 n2 = vec2(-sin(maxAngle), cos(maxAngle));
    
    float a1 = dot(o, n1);
    float a2 = dot(o, n2);
    float b1 = dot(d, n1);
    float b2 = dot(d, n2);
    
    float t1 = -a1 / b1;
    float t2 = -a2 / b2;
    float s1 = sign(a1);
    float s2 = sign(a2);

    float tmin = min(t1, t2);
    float tmax = max(t1, t2);
    float smin = tmin == t1 ? s1 : s2;
    float smax = tmin == t1 ? s2 : s1;    

    bool e = tmin >= 0.0;
    bool f = tmax >= 0.0;
    bool g = smin >= 0.0;
    bool h = smax >= 0.0;
    
    if (e != g && f == h) return vec2(tmin, tmax);
    else if (e == g && f == h) return vec2(-INF_HIT, tmin);
    else if (e != g && f != h) return vec2(tmax, +INF_HIT);
    else return vec2(NO_HIT);
}

vec4 intersectFlippedWedge(Ray ray, float minAngle, float maxAngle)
{    
    vec2 planeIntersectMin = intersectHalfSpace(ray, minAngle);
    vec2 planeIntersectMax = intersectHalfSpace(ray, maxAngle + czm_pi);
    return vec4(planeIntersectMin, planeIntersectMax);
}

vec2 intersectUnitCylinder(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d.xy, d.xy);
    float b = dot(o.xy, d.xy);
    float c = dot(o.xy, o.xy) - 1.0;
    float det = b * b - a * c;
    
    if (det < 0.0) {
        return vec2(NO_HIT);
    }
    
    det = sqrt(det);
    float ta = (-b - det) / a;
    float tb = (-b + det) / a;
    float t1 = min(ta, tb);
    float t2 = max(ta, tb);
    
    float z1 = o.z + t1 * d.z;
    float z2 = o.z + t2 * d.z;
    
    if (abs(z1) >= 1.0)
    {
        float tCap = (sign(z1) - o.z) / d.z;
        t1 = abs(b + a * tCap) < det ? tCap : NO_HIT;
    }
    
    if (abs(z2) >= 1.0)
    {
        float tCap = (sign(z2) - o.z) / d.z;
        t2 = abs(b + a * tCap) < det ? tCap : NO_HIT;
    }
    
    return vec2(t1, t2);
}

vec2 intersectUnitCircle(Ray ray) {
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float t = -o.z / d.z;
    vec2 zPlanePos = o.xy + d.xy * t;
    float distSqr = dot(zPlanePos, zPlanePos);

    if (distSqr > 1.0) {
        return vec2(NO_HIT);
    }
    
    return vec2(t, t);
}

vec2 intersectInfiniteUnitCylinder(Ray ray)
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
    
    float a = dot(d.xy, d.xy);
    float b = dot(o.xy, d.xy);
    float c = dot(o.xy, o.xy) - 1.0;
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

void intersectShape(Ray ray, inout Intersections ix)
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
        vec2 outerIntersect = intersectUnitCircle(ray);
    #else
        vec2 outerIntersect = intersectUnitCylinder(ray);
    #endif

    setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MAX, outerIntersect);

    if (outerIntersect.x == NO_HIT) {
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
        vec2 innerIntersect = intersectInfiniteUnitCylinder(ray);
        setIntersection(ix, 0, outerIntersect.x, true, true);   // positive, enter
        setIntersection(ix, 1, innerIntersect.x, false, true);  // negative, enter
        setIntersection(ix, 2, innerIntersect.y, false, false); // negative, exit
        setIntersection(ix, 3, outerIntersect.y, true, false);  // positive, exit
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN)
        Ray innerRay = Ray(ray.pos * u_cylinderUvToRenderRadiusMin, ray.dir * u_cylinderUvToRenderRadiusMin);
        vec2 innerIntersect = intersectInfiniteUnitCylinder(innerRay);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MIN, innerIntersect);
    #endif

    #if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF)
        vec2 wedgeIntersect = intersectRegularWedge(ray, u_cylinderRenderAngleMinMax.x, u_cylinderRenderAngleMinMax.y);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE, wedgeIntersect);
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF)
        vec4 wedgeIntersect = intersectFlippedWedge(ray, u_cylinderRenderAngleMinMax.x, u_cylinderRenderAngleMinMax.y);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersect.xy);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersect.zw);
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_HALF)
        vec2 wedgeIntersect = intersectHalfSpace(ray, u_cylinderRenderAngleMinMax.x);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE, wedgeIntersect);
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_ZERO)
        vec4 wedgeIntersect = intersectHalfPlane(ray, u_cylinderRenderAngleMinMax.x);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersect.xy);
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersect.zw);
    #endif
}

// export { intersectShape };