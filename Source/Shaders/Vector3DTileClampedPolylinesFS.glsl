uniform vec4 u_highlightColor;
void main()
{
    gl_FragColor = vec4(u_highlightColor.rgb, 0.5);
}
