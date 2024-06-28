void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    float A = -dot(position, position);
    if (A < -4.0) discard;
    float B = exp(A) * color.w;
    color = vec4(B * color.xyz, B);
}
