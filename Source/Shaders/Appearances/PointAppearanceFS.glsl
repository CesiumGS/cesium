uniform vec4 highlightColor;

varying vec3 v_color;

void main()
{
    gl_FragColor = vec4(v_color * highlightColor.rgb, highlightColor.a);
}
