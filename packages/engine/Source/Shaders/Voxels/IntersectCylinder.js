//This file is automatically rebuilt by the Cesium build process.
export default "// See IntersectionUtils.glsl for the definitions of Ray, setIntersection,\n\
// setIntersectionPair\n\
\n\
/* Cylinder defines (set in Scene/VoxelCylinderShape.js)\n\
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN\n\
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX\n\
#define CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT\n\
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT\n\
#define CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT\n\
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE\n\
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF\n\
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF\n\
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_HALF\n\
#define CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO\n\
\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_RADIUS_FLAT\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT_FLAT\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_RANGE_EQUAL_ZERO\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY\n\
#define CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED\n\
\n\
#define CYLINDER_INTERSECTION_INDEX_RADIUS_MAX\n\
#define CYLINDER_INTERSECTION_INDEX_RADIUS_MIN\n\
#define CYLINDER_INTERSECTION_INDEX_ANGLE\n\
*/\n\
\n\
// Cylinder uniforms\n\
#if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX) || defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT)\n\
    uniform vec3 u_cylinderUvToRenderBoundsScale;\n\
    uniform vec3 u_cylinderUvToRenderBoundsTranslate;\n\
#endif\n\
#if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN) && !defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT)\n\
    uniform float u_cylinderUvToRenderRadiusMin;\n\
#endif\n\
#if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE)\n\
    uniform vec2 u_cylinderRenderAngleMinMax;\n\
#endif\n\
\n\
vec4 intersectHalfPlane(Ray ray, float angle) {\n\
    vec2 o = ray.pos.xy;\n\
    vec2 d = ray.dir.xy;\n\
    vec2 planeDirection = vec2(cos(angle), sin(angle));\n\
    vec2 planeNormal = vec2(planeDirection.y, -planeDirection.x);\n\
\n\
    float a = dot(o, planeNormal);\n\
    float b = dot(d, planeNormal);\n\
    float t = -a / b;\n\
\n\
    vec2 p = o + t * d;\n\
    bool outside = dot(p, planeDirection) < 0.0;\n\
    if (outside) return vec4(-INF_HIT, +INF_HIT, NO_HIT, NO_HIT);\n\
\n\
    return vec4(-INF_HIT, t, t, +INF_HIT);\n\
}\n\
\n\
#define POSITIVE_HIT vec2(t, +INF_HIT);\n\
#define NEGATIVE_HIT vec2(-INF_HIT, t);\n\
\n\
vec2 intersectHalfSpace(Ray ray, float angle)\n\
{\n\
    vec2 o = ray.pos.xy;\n\
    vec2 d = ray.dir.xy;\n\
    vec2 n = vec2(sin(angle), -cos(angle));\n\
\n\
    float a = dot(o, n);\n\
    float b = dot(d, n);\n\
    float t = -a / b;\n\
    float s = sign(a);\n\
\n\
    // Half space cuts right through the camera, pick the side to intersect\n\
    if (a == 0.0) {\n\
        if (b >= 0.0) {\n\
            return POSITIVE_HIT;\n\
        } else {\n\
            return NEGATIVE_HIT;\n\
        }\n\
    }\n\
\n\
    if (t >= 0.0 != s >= 0.0) {\n\
        return POSITIVE_HIT;\n\
    } else {\n\
        return NEGATIVE_HIT;\n\
    }\n\
}\n\
\n\
vec2 intersectRegularWedge(Ray ray, float minAngle, float maxAngle)\n\
{\n\
    vec2 o = ray.pos.xy;\n\
    vec2 d = ray.dir.xy;\n\
    vec2 n1 = vec2(sin(minAngle), -cos(minAngle));\n\
    vec2 n2 = vec2(-sin(maxAngle), cos(maxAngle));\n\
\n\
    float a1 = dot(o, n1);\n\
    float a2 = dot(o, n2);\n\
    float b1 = dot(d, n1);\n\
    float b2 = dot(d, n2);\n\
\n\
    float t1 = -a1 / b1;\n\
    float t2 = -a2 / b2;\n\
    float s1 = sign(a1);\n\
    float s2 = sign(a2);\n\
\n\
    float tmin = min(t1, t2);\n\
    float tmax = max(t1, t2);\n\
    float smin = tmin == t1 ? s1 : s2;\n\
    float smax = tmin == t1 ? s2 : s1;\n\
\n\
    bool e = tmin >= 0.0;\n\
    bool f = tmax >= 0.0;\n\
    bool g = smin >= 0.0;\n\
    bool h = smax >= 0.0;\n\
\n\
    if (e != g && f == h) return vec2(tmin, tmax);\n\
    else if (e == g && f == h) return vec2(-INF_HIT, tmin);\n\
    else if (e != g && f != h) return vec2(tmax, +INF_HIT);\n\
    else return vec2(NO_HIT);\n\
}\n\
\n\
vec4 intersectFlippedWedge(Ray ray, float minAngle, float maxAngle)\n\
{\n\
    vec2 planeIntersectMin = intersectHalfSpace(ray, minAngle);\n\
    vec2 planeIntersectMax = intersectHalfSpace(ray, maxAngle + czm_pi);\n\
    return vec4(planeIntersectMin, planeIntersectMax);\n\
}\n\
\n\
vec2 intersectUnitCylinder(Ray ray)\n\
{\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
\n\
    float a = dot(d.xy, d.xy);\n\
    float b = dot(o.xy, d.xy);\n\
    float c = dot(o.xy, o.xy) - 1.0;\n\
    float det = b * b - a * c;\n\
\n\
    if (det < 0.0) {\n\
        return vec2(NO_HIT);\n\
    }\n\
\n\
    det = sqrt(det);\n\
    float ta = (-b - det) / a;\n\
    float tb = (-b + det) / a;\n\
    float t1 = min(ta, tb);\n\
    float t2 = max(ta, tb);\n\
\n\
    float z1 = o.z + t1 * d.z;\n\
    float z2 = o.z + t2 * d.z;\n\
\n\
    if (abs(z1) >= 1.0)\n\
    {\n\
        float tCap = (sign(z1) - o.z) / d.z;\n\
        t1 = abs(b + a * tCap) < det ? tCap : NO_HIT;\n\
    }\n\
\n\
    if (abs(z2) >= 1.0)\n\
    {\n\
        float tCap = (sign(z2) - o.z) / d.z;\n\
        t2 = abs(b + a * tCap) < det ? tCap : NO_HIT;\n\
    }\n\
\n\
    return vec2(t1, t2);\n\
}\n\
\n\
vec2 intersectUnitCircle(Ray ray) {\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
\n\
    float t = -o.z / d.z;\n\
    vec2 zPlanePos = o.xy + d.xy * t;\n\
    float distSqr = dot(zPlanePos, zPlanePos);\n\
\n\
    if (distSqr > 1.0) {\n\
        return vec2(NO_HIT);\n\
    }\n\
\n\
    return vec2(t, t);\n\
}\n\
\n\
vec2 intersectInfiniteUnitCylinder(Ray ray)\n\
{\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
\n\
    float a = dot(d.xy, d.xy);\n\
    float b = dot(o.xy, d.xy);\n\
    float c = dot(o.xy, o.xy) - 1.0;\n\
    float det = b * b - a * c;\n\
\n\
    if (det < 0.0) {\n\
        return vec2(NO_HIT);\n\
    }\n\
\n\
    det = sqrt(det);\n\
    float t1 = (-b - det) / a;\n\
    float t2 = (-b + det) / a;\n\
    float tmin = min(t1, t2);\n\
    float tmax = max(t1, t2);\n\
\n\
    return vec2(tmin, tmax);\n\
}\n\
\n\
void intersectShape(Ray ray, inout Intersections ix)\n\
{\n\
    #if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX) || defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT)\n\
        ray.pos = ray.pos * u_cylinderUvToRenderBoundsScale + u_cylinderUvToRenderBoundsTranslate;\n\
        ray.dir *= u_cylinderUvToRenderBoundsScale;\n\
    #else\n\
        // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].\n\
        // Direction is scaled as well to be in sync with position.\n\
        ray.pos = ray.pos * 2.0 - 1.0;\n\
        ray.dir *= 2.0;\n\
    #endif\n\
\n\
    #if defined(CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT)\n\
        vec2 outerIntersect = intersectUnitCircle(ray);\n\
    #else\n\
        vec2 outerIntersect = intersectUnitCylinder(ray);\n\
    #endif\n\
\n\
    setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MAX, outerIntersect);\n\
\n\
    if (outerIntersect.x == NO_HIT) {\n\
        return;\n\
    }\n\
\n\
    #if defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT)\n\
        // When the cylinder is perfectly thin it's necessary to sandwich the\n\
        // inner cylinder intersection inside the outer cylinder intersection.\n\
\n\
        // Without this special case,\n\
        // [outerMin, outerMax, innerMin, innerMax] will bubble sort to\n\
        // [outerMin, innerMin, outerMax, innerMax] which will cause the back\n\
        // side of the cylinder to be invisible because it will think the ray\n\
        // is still inside the inner (negative) cylinder after exiting the\n\
        // outer (positive) cylinder.\n\
\n\
        // With this special case,\n\
        // [outerMin, innerMin, innerMax, outerMax] will bubble sort to\n\
        // [outerMin, innerMin, innerMax, outerMax] which will work correctly.\n\
\n\
        // Note: If initializeIntersections() changes its sorting function\n\
        // from bubble sort to something else, this code may need to change.\n\
        vec2 innerIntersect = intersectInfiniteUnitCylinder(ray);\n\
        setIntersection(ix, 0, outerIntersect.x, true, true);   // positive, enter\n\
        setIntersection(ix, 1, innerIntersect.x, false, true);  // negative, enter\n\
        setIntersection(ix, 2, innerIntersect.y, false, false); // negative, exit\n\
        setIntersection(ix, 3, outerIntersect.y, true, false);  // positive, exit\n\
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN)\n\
        Ray innerRay = Ray(ray.pos * u_cylinderUvToRenderRadiusMin, ray.dir * u_cylinderUvToRenderRadiusMin);\n\
        vec2 innerIntersect = intersectInfiniteUnitCylinder(innerRay);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_RADIUS_MIN, innerIntersect);\n\
    #endif\n\
\n\
    #if defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF)\n\
        vec2 wedgeIntersect = intersectRegularWedge(ray, u_cylinderRenderAngleMinMax.x, u_cylinderRenderAngleMinMax.y);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE, wedgeIntersect);\n\
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF)\n\
        vec4 wedgeIntersect = intersectFlippedWedge(ray, u_cylinderRenderAngleMinMax.x, u_cylinderRenderAngleMinMax.y);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersect.xy);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersect.zw);\n\
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_HALF)\n\
        vec2 wedgeIntersect = intersectHalfSpace(ray, u_cylinderRenderAngleMinMax.x);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE, wedgeIntersect);\n\
    #elif defined(CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO)\n\
        vec4 wedgeIntersect = intersectHalfPlane(ray, u_cylinderRenderAngleMinMax.x);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 0, wedgeIntersect.xy);\n\
        setIntersectionPair(ix, CYLINDER_INTERSECTION_INDEX_ANGLE + 1, wedgeIntersect.zw);\n\
    #endif\n\
}\n\
";
