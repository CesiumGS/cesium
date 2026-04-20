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
    fsInput.attributes.color_0 = baseColor;
#if defined(HAS_FEATURE_IDS)
    fsInput.attributes.featureId_0 = v_featureId;
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
    out_FragColor = vec4(finalRgb * finalAlpha, finalAlpha);
#else
    out_FragColor = baseColor;
#endif
}
