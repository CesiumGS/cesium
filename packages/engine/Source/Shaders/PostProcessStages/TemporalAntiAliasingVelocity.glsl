in vec2 v_textureCoordinates;

uniform sampler2D depthTexture;
uniform mat4 u_previousViewProjection;
uniform float u_hasPreviousViewProjection;

bool computePreviousUv(vec2 uv, out vec2 previousUv)
{
    float depth = czm_readDepth(depthTexture, uv);
    if (depth <= 0.0 || depth >= 1.0) {
        return false;
    }

    vec2 ndc = uv * 2.0 - 1.0;
    vec4 positionWC = czm_inverseViewProjection * vec4(ndc, depth, 1.0);
    positionWC /= positionWC.w;

    vec4 previousClip = u_previousViewProjection * positionWC;
    if (abs(previousClip.w) < 1e-5) {
        return false;
    }

    vec2 previousNdc = previousClip.xy / previousClip.w;
    previousUv = previousNdc * 0.5 + 0.5;

    return all(greaterThanEqual(previousUv, vec2(0.0))) &&
           all(lessThanEqual(previousUv, vec2(1.0)));
}

void main()
{
    if (u_hasPreviousViewProjection < 0.5) {
        out_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
        return;
    }

    vec2 previousUv;
    bool valid = computePreviousUv(v_textureCoordinates, previousUv);
    if (!valid) {
        out_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
        return;
    }

    vec2 velocity = v_textureCoordinates - previousUv;
    float motion = length(velocity);
    if (motion > 0.03) {
        out_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
        return;
    }

    vec2 encoded = clamp(velocity * 0.5 + 0.5, 0.0, 1.0);
    out_FragColor = vec4(encoded, 0.0, 1.0);
}
