void main() {
    mediump float A = dot(v_vertPos, v_vertPos);
    if(A > 1.0)
        discard;
    mediump float scale = 4.0;
    mediump float B = exp(-A * scale) * (v_splatColor.a);
    out_FragColor = vec4(v_splatColor.rgb * B, B);
}
