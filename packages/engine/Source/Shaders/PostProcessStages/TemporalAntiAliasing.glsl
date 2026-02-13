in vec2 v_textureCoordinates;

uniform sampler2D colorTexture;
uniform sampler2D historyTexture;
uniform sampler2D velocityTexture;

uniform float u_feedback;
uniform float u_reset;

vec3 clampHistoryToNeighborhood(vec2 uv, vec3 historyColor)
{
    vec2 texel = 1.0 / czm_viewport.zw;

    vec3 c = texture(colorTexture, uv).rgb;
    vec3 n0 = texture(colorTexture, uv + vec2(texel.x, 0.0)).rgb;
    vec3 n1 = texture(colorTexture, uv + vec2(-texel.x, 0.0)).rgb;
    vec3 n2 = texture(colorTexture, uv + vec2(0.0, texel.y)).rgb;
    vec3 n3 = texture(colorTexture, uv + vec2(0.0, -texel.y)).rgb;

    vec3 boxMin = min(c, min(n0, min(n1, min(n2, n3))));
    vec3 boxMax = max(c, max(n0, max(n1, max(n2, n3))));
    // Widen clamp a bit for stochastic inputs so history can still denoise.
    vec3 clampSlack = vec3(0.04);

    return clamp(historyColor, boxMin - clampSlack, boxMax + clampSlack);
}

void main()
{
    vec4 currentColor = texture(colorTexture, v_textureCoordinates);
    if (u_reset > 0.5) {
        out_FragColor = currentColor;
        return;
    }

    vec4 velocitySample = texture(velocityTexture, v_textureCoordinates);
    vec2 velocity = velocitySample.xy * 2.0 - 1.0;
    vec2 previousUv = v_textureCoordinates - velocity;
    bool hasReprojection = velocitySample.a > 0.5 &&
        all(greaterThanEqual(previousUv, vec2(0.0))) &&
        all(lessThanEqual(previousUv, vec2(1.0)));
    float motion = hasReprojection ? length(velocity) : 0.0;

    if (!hasReprojection) {
        previousUv = v_textureCoordinates;
    }

    vec4 historyColor = texture(historyTexture, previousUv);
    historyColor.rgb = clampHistoryToNeighborhood(v_textureCoordinates, historyColor.rgb);

    float feedback = clamp(u_feedback, 0.0, 1.0);
    float motionFactor = hasReprojection ? smoothstep(0.003, 0.08, motion) : 0.0;
    // Motion should reduce history, but not too aggressively or stochastic denoising collapses.
    feedback = mix(feedback, min(feedback, 0.75), motionFactor);

    // Keep this rejection soft. Hard rejection turns TAA into near-current-frame rendering.
    float currentLuma = dot(currentColor.rgb, vec3(0.299, 0.587, 0.114));
    float historyLuma = dot(historyColor.rgb, vec3(0.299, 0.587, 0.114));
    float lumaDiff = abs(currentLuma - historyLuma);
    float mismatch = smoothstep(0.3, 1.2, lumaDiff);
    feedback = mix(feedback, min(feedback, 0.8), mismatch);

    if (!hasReprojection) {
        feedback = min(feedback, 0.85);
    }

    out_FragColor = mix(currentColor, historyColor, feedback);
}
