void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    float A = -dot(v_vertPos, v_vertPos);
    if(A < -4.0)
        discard;
    float B = exp(A) * v_splatOpacity;
    color = vec4(v_splatColor.rgb * B , B);
}

