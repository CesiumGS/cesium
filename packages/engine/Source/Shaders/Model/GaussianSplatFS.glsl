vec4 gaussianSplatStage(inout vec4 color, vec4 position) {
    float A = -dot(position, position);
    if (A < -4.0) discard;
    float B = exp(A) * color.w;
    color = vec4(B * color.xyz, B);
}
