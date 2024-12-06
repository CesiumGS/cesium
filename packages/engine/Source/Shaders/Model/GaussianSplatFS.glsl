void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    mediump float A = dot(v_vertPos, v_vertPos);
    if(A > 1.0)
        discard;
    mediump float B = exp(-A * 4.0) * (v_splatColor.a);
    color = vec4(v_splatColor.rgb * B, B);
}

