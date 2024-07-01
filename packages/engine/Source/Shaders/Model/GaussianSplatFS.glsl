void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    float A =  -dot(v_vertPos, v_vertPos);
    if(A < -4.0)
        discard;
    float B = exp(A) * color.w;
    color = vec4(color.xyz * B, B);
}
