struct Ray {
    vec3 pos;
    vec3 dir;
    vec3 rawDir;
};

#if defined(JITTER)
/**
 * Generate a pseudo-random value for a given 2D screen coordinate.
 * Similar to https://www.shadertoy.com/view/4djSRW with a modified hashscale.
 */
float hash(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * 50.0);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
#endif

float minComponent(in vec3 v) {
    return min(min(v.x, v.y), v.z);
}

float maxComponent(in vec3 v) {
    return max(max(v.x, v.y), v.z);
}

struct PointJacobianT {
    vec3 point;
    mat3 jacobianT;
};
