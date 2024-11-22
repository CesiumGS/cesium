void gaussianSplatStage(inout vec4 color, in ProcessedAttributes attributes) {
    mediump float A = dot(v_vertPos, v_vertPos);
    if(A > 1.0)
        discard;
    mediump float alpha = clamp(v_splatColor.a  * 2., 0., 1.);
    mediump float B = exp(-A * 4.0) *alpha;
    color = vec4(v_splatColor.rgb * B, B);
}

