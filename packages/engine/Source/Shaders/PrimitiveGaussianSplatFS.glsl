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
        if (rand < B) {
            out_FragColor = vec4(v_splatColor.rgb, 1.0);
        } else {
            discard;
        }
    } else {
        out_FragColor = vec4(v_splatColor.rgb * B, B);
    }
}
