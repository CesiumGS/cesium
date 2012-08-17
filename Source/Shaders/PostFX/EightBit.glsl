uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

const int KERNEL_WIDTH = 16;

void main(void)
{
// TODO: do not assume full-screen
    vec2 u_step = vec2(1.0 / float(agi_viewport.z), 1.0 / float(agi_viewport.w));

    vec2 integralPos = v_textureCoordinates - mod(v_textureCoordinates, 8.0 * u_step);
    vec3 averageValue = vec3(0.0);
    for (int i = 0; i < KERNEL_WIDTH; i++)
    {
        for (int j = 0; j < KERNEL_WIDTH; j++)
        {
            averageValue += texture2D(u_texture, integralPos + u_step * vec2(i, j)).rgb;
        }
    }
    averageValue /= float(KERNEL_WIDTH * KERNEL_WIDTH);
    gl_FragColor = vec4(averageValue, 1.0);
}
