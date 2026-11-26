uniform sampler2D colorTexture;
uniform sampler2D historyTexture;
uniform sampler2D velocityTexture;

uniform float u_feedback;
uniform float u_progressiveWeight;
uniform float u_reset;

in vec2 v_textureCoordinates;

const vec3 LUMA_WEIGHTS = vec3(0.299, 0.587, 0.114);

// Clamps the history to the range of colors around the current pixel, which
// rejects history that no longer matches the scene.
vec3 clampToNeighborhood(vec3 historyColor, vec3 currentColor)
{
    vec2 texel = 1.0 / czm_viewport.zw;
    vec3 left = texture(colorTexture, v_textureCoordinates - vec2(texel.x, 0.0)).rgb;
    vec3 right = texture(colorTexture, v_textureCoordinates + vec2(texel.x, 0.0)).rgb;
    vec3 down = texture(colorTexture, v_textureCoordinates - vec2(0.0, texel.y)).rgb;
    vec3 up = texture(colorTexture, v_textureCoordinates + vec2(0.0, texel.y)).rgb;

    vec3 minColor = min(currentColor, min(min(left, right), min(down, up)));
    vec3 maxColor = max(currentColor, max(max(left, right), max(down, up)));

    // Stochastic input is noisy, so a strict clamp would keep the noise.
    const float slack = 0.04;
    return clamp(historyColor, minColor - slack, maxColor + slack);
}

void main()
{
    vec4 currentColor = texture(colorTexture, v_textureCoordinates);
    if (u_reset > 0.5) {
        out_FragColor = currentColor;
        return;
    }

    // The camera is still: average all frames with equal weights.
    if (u_progressiveWeight > 0.0) {
        vec4 historyColor = texture(historyTexture, v_textureCoordinates);
        out_FragColor = mix(historyColor, currentColor, u_progressiveWeight);
        return;
    }

    vec4 velocitySample = texture(velocityTexture, v_textureCoordinates);
    bool reprojected = velocitySample.a > 0.5;
    vec2 velocity = reprojected ? velocitySample.xy * 2.0 - 1.0 : vec2(0.0);

    vec4 historyColor = texture(historyTexture, v_textureCoordinates - velocity);
    historyColor.rgb = clampToNeighborhood(historyColor.rgb, currentColor.rgb);

    // Trust the history less the more it may be wrong: where the pixel moved,
    // where its brightness changed, and where it could not be reprojected.
    // The limits are soft, because a noisy frame needs the history to denoise.
    float feedback = clamp(u_feedback, 0.0, 1.0);

    float motion = smoothstep(0.003, 0.08, length(velocity));
    feedback = mix(feedback, min(feedback, 0.75), motion);

    float lumaDifference = abs(dot(currentColor.rgb - historyColor.rgb, LUMA_WEIGHTS));
    float mismatch = smoothstep(0.3, 1.2, lumaDifference);
    feedback = mix(feedback, min(feedback, 0.8), mismatch);

    if (!reprojected) {
        feedback = min(feedback, 0.85);
    }

    out_FragColor = mix(currentColor, historyColor, feedback);
}
