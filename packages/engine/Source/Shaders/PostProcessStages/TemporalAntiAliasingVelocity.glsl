uniform sampler2D depthTexture;
uniform mat4 u_previousViewProjection;

in vec2 v_textureCoordinates;

// Pixels that moved further than this, in texture coordinates, are not reprojected.
const float MAX_MOTION = 0.03;

// Finds where the surface at the given texture coordinates was in the previous
// frame. Returns false if there is no surface, or if it was off screen.
bool reproject(vec2 uv, out vec2 previousUv)
{
    float depth = czm_readDepth(depthTexture, uv);
    if (depth <= 0.0 || depth >= 1.0) {
        return false;
    }

    vec4 positionWC = czm_inverseViewProjection * vec4(uv * 2.0 - 1.0, depth, 1.0);
    vec4 previousClip = u_previousViewProjection * (positionWC / positionWC.w);
    if (abs(previousClip.w) < 1e-5) {
        return false;
    }

    previousUv = previousClip.xy / previousClip.w * 0.5 + 0.5;
    return all(greaterThanEqual(previousUv, vec2(0.0))) &&
        all(lessThanEqual(previousUv, vec2(1.0)));
}

// Writes the motion of each pixel since the previous frame: xy is the velocity
// in texture coordinates, remapped from [-1, 1] to [0, 1], and alpha is 1.0
// where the pixel can be reprojected.
void main()
{
    vec2 previousUv;
    if (reproject(v_textureCoordinates, previousUv)) {
        vec2 velocity = v_textureCoordinates - previousUv;
        if (length(velocity) <= MAX_MOTION) {
            out_FragColor = vec4(velocity * 0.5 + 0.5, 0.0, 1.0);
            return;
        }
    }
    out_FragColor = vec4(0.0);
}
