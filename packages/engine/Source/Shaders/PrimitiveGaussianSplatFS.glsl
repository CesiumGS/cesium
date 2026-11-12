//
// Fragment shader for Gaussian splats.
// Renders a Gaussian splat within a quad, discarding fragments outside the unit circle.
// Applies an approximate Gaussian falloff based on distance from the center and outputs
// a color modulated by the alpha and Gaussian weight.
//

void main() {
    if (v_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard;
    if (v_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard;

    float A = -dot(v_vertPos, v_vertPos);
    if (A < -4.) {
        discard;
    }

    float B = exp(A * 4.) * v_splatColor.a;
    vec4 baseColor = vec4(v_splatColor.rgb * B, B);

#if defined(HAS_CUSTOM_FRAGMENT_SHADER)
    FragmentInput fsInput;
    vec3 positionEC = czm_windowToEyeCoordinates(gl_FragCoord).xyz;
    fsInput.attributes.positionEC = positionEC;
    fsInput.attributes.positionWC = (czm_inverseView * vec4(positionEC, 1.0)).xyz;
    fsInput.attributes.normalEC = vec3(0.0, 0.0, 1.0);
    fsInput.attributes.color_0 = vec4(
        baseColor.a > 0.0 ? baseColor.rgb / baseColor.a : vec3(0.0),
        baseColor.a
    );
#if defined(HAS_FEATURE_IDS)
    fsInput.attributes.featureId_0 = v_featureId_0;
#if FEATURE_ID_COUNT > 1
    fsInput.attributes.featureId_1 = v_featureId_1;
#endif
#if FEATURE_ID_COUNT > 2
    fsInput.attributes.featureId_2 = v_featureId_2;
#endif
#if FEATURE_ID_COUNT > 3
    fsInput.attributes.featureId_3 = v_featureId_3;
#endif
#else
    fsInput.attributes.featureId_0 = 0;
#endif

    czm_modelMaterial material;
    // baseColor.rgb is already pre-multiplied by alpha (B).  Undo it so
    // fragmentMain sees the true linear colour; the post-fragmentMain code
    // will re-apply pre-multiplied alpha for the blend state.
    material.diffuse = baseColor.a > 0.0 ? baseColor.rgb / baseColor.a : vec3(0.0);
    material.alpha = baseColor.a;
    material.normalEC = fsInput.attributes.normalEC;
    material.occlusion = 1.0;
    material.emissive = vec3(0.0);

    fragmentMain(fsInput, material);

    // Re-apply pre-multiplied alpha to match PRE_MULTIPLIED_ALPHA_BLEND.
    vec3 finalRgb = max(material.diffuse, vec3(0.0));
    float finalAlpha = clamp(material.alpha, 0.0, 1.0);
    vec4 splatColor = vec4(finalRgb * finalAlpha, finalAlpha);
#else
    vec4 splatColor = baseColor;
#endif

    if (u_stochastic > 0.5) {
        // Spark-style stochastic transparency: treat alpha as coverage and use a hash that
        // includes per-splat entropy. This relies on depth writes + no blending.
        uint uTime = (u_stochasticSteady > 0.5) ? 0u : floatBitsToUint(czm_frameNumber);
        uvec2 coord = uvec2(gl_FragCoord.xy);
        uint state = uTime + 0x9e3779b9u * coord.x + 0x85ebca6bu * coord.y + 0xc2b2ae35u * v_splatIndex;
        state = state * 747796405u + 2891336453u;
        uint hash = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
        hash = (hash >> 22u) ^ hash;
        float rand = float(hash) / 4294967296.0;
        if (rand >= splatColor.a) {
            discard;
        }
        out_FragColor = vec4(splatColor.rgb / splatColor.a, 1.0);
    } else {
        out_FragColor = splatColor;
    }
}
