uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

void main()
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;

    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    color = (color * (a * color + b)) / (color * (c * color + d) + e);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
