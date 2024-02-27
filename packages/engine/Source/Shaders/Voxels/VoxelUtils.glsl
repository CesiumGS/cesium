#define RAY_SHIFT (0.000003163)
#define RAY_SCALE (1.00003163)

struct Ray {
    vec3 pos;
    vec3 dir;
#if defined(SHAPE_BOX)
    vec3 dInv;
#else
    vec3 rawDir;
#endif
};

#if defined(JITTER)
float hash(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * 50.0); // magic number = hashscale
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
#endif

float minComponent(in vec3 v) {
    return min(min(v.x, v.y), v.z);
}

struct PointJacobianT {
    vec3 point;
    mat3 jacobianT;
};
