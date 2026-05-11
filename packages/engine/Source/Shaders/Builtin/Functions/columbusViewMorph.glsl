/**
 * DOC_TBA
 *
 * @name czm_columbusViewMorph
 * @glslFunction
 */
vec4 czm_columbusViewMorph(vec4 position2D, vec4 position3D, float time)
{
    // Just linear for now.
    // We're manually doing the equivalent of a `mix` here because, some GPUs
    // (NVidia GeForce 3070 Ti and Intel Arc A750, to name two), `mix` seems to
    // use an alternate formulation that introduces jitter even when `time` is
    // 0.0 or 1.0. That is, the value of `p` won't be exactly `position2D.xyz`
    // when `time` is 0.0 and it won't be exactly `position3D.xyz` when `time` is
    // 1.0. The "textbook" formulation here, while probably a bit slower,
    // does not have this problem.
    vec3 p = position2D.xyz * (1.0 - time) + position3D.xyz * time;
    return vec4(p, 1.0);
}
