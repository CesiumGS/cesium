void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    float A = dot(v_vertPos, v_vertPos);
    if(A > 2.0)
        discard;

    float B = exp(-A * 2.5) * v_splatColor.a;
    color = vec4(v_splatColor.rgb * B, B);
}

