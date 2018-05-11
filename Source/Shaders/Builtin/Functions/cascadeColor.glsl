
vec4 czm_cascadeColor(vec4 weights)
{
    return vec4(1.0, 0.0, 0.0, 1.0) * weights.x +
           vec4(0.0, 1.0, 0.0, 1.0) * weights.y +
           vec4(0.0, 0.0, 1.0, 1.0) * weights.z +
           vec4(1.0, 0.0, 1.0, 1.0) * weights.w;
}
