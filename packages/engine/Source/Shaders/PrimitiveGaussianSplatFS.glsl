//
// Fragment shader for Gaussian splats.
// Renders a Gaussian splat within a quad, discarding fragments outside the unit circle.
// Applies an approximate Gaussian falloff based on distance from the center and outputs
// a color modulated by the alpha and Gaussian weight.
//
void main() {
    if (v_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard;
    if (v_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard;

    mediump float A = dot(v_vertPos, v_vertPos);
    if(A > 1.0) {
        discard;
    }
    mediump float scale = 4.0;
    mediump float B = exp(-A * scale) * (v_splatColor.a);
    out_FragColor = vec4(v_splatColor.rgb * B, B);
}
