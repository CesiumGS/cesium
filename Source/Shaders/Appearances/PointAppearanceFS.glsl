uniform vec4 highlightColor;

varying vec3 v_color;

void main()
{
    // TODO: custom optimized shader

    gl_FragColor = vec4(v_color * highlightColor.rgb, highlightColor.a);
}
