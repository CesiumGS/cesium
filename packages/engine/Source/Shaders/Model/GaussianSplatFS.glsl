void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {

    // Resample using conic matrix (cf. "Surface
    // Splatting" by Zwicker et al., 2001)
    vec2 d = v_screen_xy - v_pixf;
    float power = -0.5 * (v_conic.x * d.x * d.x + v_conic.z * d.y * d.y) - v_conic.y * d.x * d.y;

    if (power > 0.) {
        discard;
    }

    // Eq. (2) from 3D Gaussian splatting paper.
    float alpha = min(.99f, color.w * exp(power));
    if (alpha < 1./255.) {
        discard;
    }

    // Eq. (3) from 3D Gaussian splatting paper.
    color = vec4(color.xyz * alpha, alpha);
}
