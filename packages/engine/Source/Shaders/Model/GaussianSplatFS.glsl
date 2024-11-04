void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    float A = dot(v_vertPos, v_vertPos);
    if(A > 1.0)
        discard;
    float alpha = clamp(v_splatColor.a * 1.5, 0., 1.);
    float B = exp(-A * 4.0) *alpha;
    color = vec4(v_splatColor.rgb * B, B);
}

