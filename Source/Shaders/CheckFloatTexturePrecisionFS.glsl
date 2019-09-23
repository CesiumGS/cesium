uniform sampler2D u_floatTexture;

void main()
{
    float actual = texture2D(u_floatTexture, vec2(0.5, 0.5)).r;
    float expected = 123456.0;
    gl_FragColor = vec4(abs(actual - expected), 0.0, 0.0, 1.0);
}
