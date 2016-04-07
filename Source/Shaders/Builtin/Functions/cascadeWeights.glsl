
uniform vec4 u_shadowMapCascadeSplits[2];

vec4 czm_cascadeWeights(float depthEye)
{
    // One component is set to 1.0 and all others set to 0.0.
    vec4 near = step(u_shadowMapCascadeSplits[0], vec4(depthEye));
    vec4 far = step(depthEye, u_shadowMapCascadeSplits[1]);
    return near * far;
}