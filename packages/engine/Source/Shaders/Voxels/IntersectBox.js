//This file is automatically rebuilt by the Cesium build process.
export default "// See IntersectionUtils.glsl for the definitions of Ray and NO_HIT\n\
\n\
/* Box defines (set in Scene/VoxelBoxShape.js)\n\
#define BOX_INTERSECTION_INDEX ### // always 0\n\
#define BOX_HAS_RENDER_BOUNDS\n\
#define BOX_IS_2D\n\
*/\n\
\n\
#if defined(BOX_HAS_RENDER_BOUNDS)\n\
    #if defined(BOX_IS_2D)\n\
        // This matrix bakes in an axis conversion so that the math works for XY plane.\n\
        uniform mat4 u_boxUvToRenderBoundsTransform;\n\
    #else\n\
        // Similar to u_boxTransformUvToBounds but fewer instructions needed.\n\
        uniform vec3 u_boxUvToRenderBoundsScale;\n\
        uniform vec3 u_boxUvToRenderBoundsTranslate;\n\
    #endif\n\
#endif\n\
\n\
vec2 intersectUnitCube(Ray ray) // Unit cube from [-1, +1]\n\
{\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
\n\
    vec3 dInv = 1.0 / d;\n\
    vec3 od = -o * dInv;\n\
    vec3 t0 = od - dInv;\n\
    vec3 t1 = od + dInv;\n\
    vec3 m0 = min(t0, t1);\n\
    vec3 m1 = max(t0, t1);\n\
    float tMin = max(max(m0.x, m0.y), m0.z);\n\
    float tMax = min(min(m1.x, m1.y), m1.z);\n\
\n\
    if (tMin >= tMax) {\n\
        return vec2(NO_HIT);\n\
    }\n\
\n\
    return vec2(tMin, tMax);\n\
}\n\
\n\
vec2 intersectUnitSquare(Ray ray) // Unit square from [-1, +1]\n\
{\n\
    vec3 o = ray.pos;\n\
    vec3 d = ray.dir;\n\
\n\
    float t = -o.z / d.z;\n\
    vec2 planePos = o.xy + d.xy * t;\n\
    if (any(greaterThan(abs(planePos), vec2(1.0)))) {\n\
        return vec2(NO_HIT);\n\
    }\n\
\n\
    return vec2(t, t);\n\
}\n\
\n\
void intersectShape(Ray ray, inout Intersections ix)\n\
{\n\
    #if defined(BOX_HAS_RENDER_BOUNDS)\n\
        #if defined(BOX_IS_2D)\n\
            // Transform the ray into unit square space on Z plane\n\
            // This matrix bakes in an axis conversion so that the math works for XY plane.\n\
            ray.pos = vec3(u_boxUvToRenderBoundsTransform * vec4(ray.pos, 1.0));\n\
            ray.dir = vec3(u_boxUvToRenderBoundsTransform * vec4(ray.dir, 0.0));\n\
            vec2 entryExit = intersectUnitSquare(ray);\n\
        #else\n\
            // Transform the ray into unit cube space\n\
            ray.pos = ray.pos * u_boxUvToRenderBoundsScale + u_boxUvToRenderBoundsTranslate;\n\
            ray.dir *= u_boxUvToRenderBoundsScale;\n\
            vec2 entryExit = intersectUnitCube(ray);\n\
        #endif\n\
    #else\n\
        // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].\n\
        // Direction is scaled as well to be in sync with position.\n\
        ray.pos = ray.pos * 2.0 - 1.0;\n\
        ray.dir = ray.dir * 2.0;\n\
        vec2 entryExit = intersectUnitCube(ray);\n\
    #endif\n\
\n\
    setIntersectionPair(ix, BOX_INTERSECTION_INDEX, entryExit);\n\
}\n\
";
