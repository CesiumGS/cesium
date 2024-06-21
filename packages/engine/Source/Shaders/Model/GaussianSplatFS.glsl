// void gaussianSplatStage(inout vec4 color, vec2 position) {
//     float A = -dot(position, position);
//     if (A < -4.0) discard;
//     float B = exp(A) * color.w;
//     color = vec4(B * color.xyz, B);
// }

void gaussianSplatStage(inout vec4 color, vec2 position) {
        // Resample using conic matrix (cf. "Surface
    // Splatting" by Zwicker et al., 2001)
    vec2 d = v_splatPosition - v_splatVertexPos;
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
