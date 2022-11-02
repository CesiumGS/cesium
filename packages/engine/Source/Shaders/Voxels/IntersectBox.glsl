// import { Ray, NO_HIT } from "./IntersectionUtils.glsl";

/* Box defines:
#define BOX_INTERSECTION_INDEX ### // always 0
#define BOX_HAS_RENDER_BOUND
#define BOX_IS_2D
*/

// Box uniforms:
#if defined(BOX_HAS_RENDER_BOUND)
    #if defined(BOX_IS_2D)
        // This matrix bakes in an axis conversion so that the math works for XY plane.
        uniform mat4 u_boxTransformUvToRenderBounds;
    #else
        // Similar to u_boxTransformUvToBounds but fewer instructions needed.
        uniform vec3 u_boxScaleUvToRenderBounds;
        uniform vec3 u_boxOffsetUvToRenderBounds;
    #endif
#endif

vec2 intersectUnitCube(Ray ray) // Unit cube from [-1, +1]
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;
                
    vec3 dInv = 1.0 / d;
    vec3 od = -o * dInv;
    vec3 t0 = od - dInv;
    vec3 t1 = od + dInv;
    vec3 m0 = min(t0, t1);
    vec3 m1 = max(t0, t1);
    float tMin = max(max(m0.x, m0.y), m0.z);
    float tMax = min(min(m1.x, m1.y), m1.z);
    
    if (tMin >= tMax) {
        return vec2(NO_HIT);
    }

    return vec2(tMin, tMax);
}

vec2 intersectUnitSquare(Ray ray) // Unit square from [-1, +1]
{
    vec3 o = ray.pos;
    vec3 d = ray.dir;

    float t = -o.z / d.z;
    vec2 planePos = o.xy + d.xy * t;
    if (any(greaterThan(abs(planePos), vec2(1.0)))) {
        return vec2(NO_HIT);
    }

    return vec2(t, t);
}

void intersectShape(Ray ray, inout Intersections ix)
{
    #if defined(BOX_HAS_RENDER_BOUND)
        #if defined(BOX_IS_2D)
            // Transform the ray into unit square space on Z plane
            // This matrix bakes in an axis conversion so that the math works for XY plane.
            ray.pos = vec3(u_boxTransformUvToRenderBounds * vec4(ray.pos, 1.0));
            ray.dir = vec3(u_boxTransformUvToRenderBounds * vec4(ray.dir, 0.0));
            vec2 entryExit = intersectUnitSquare(ray);
        #else
            // Transform the ray into unit cube space
            ray.pos = ray.pos * u_boxScaleUvToRenderBounds + u_boxOffsetUvToRenderBounds;
            ray.dir *= u_boxScaleUvToRenderBounds;
            vec2 entryExit = intersectUnitCube(ray);
        #endif
    #else
        // Position is converted from [0,1] to [-1,+1] because shape intersections assume unit space is [-1,+1].
        // Direction is scaled as well to be in sync with position. 
        ray.pos = ray.pos * 2.0 - 1.0;
        ray.dir = ray.dir * 2.0;
        vec2 entryExit = intersectUnitCube(ray);
    #endif

    setIntersectionPair(ix, BOX_INTERSECTION_INDEX, entryExit);
}
