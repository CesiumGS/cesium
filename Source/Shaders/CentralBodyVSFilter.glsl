#define KERNEL_SIZE 7

attribute vec4 position;
attribute vec2 textureCoordinates;

#ifdef VERTICAL
uniform float u_height;
#else
uniform float u_width;
#endif

varying vec2 v_textureCoordinates[KERNEL_SIZE];

void main()
{
#ifdef VERTICAL
    float stepSize = 1.0 / u_height;
#else
    float stepSize = 1.0 / u_width;
#endif

    const int center = KERNEL_SIZE / 2;
    for (int i = 0; i < KERNEL_SIZE; ++i) {
#ifdef VERTICAL
        vec2 offset = vec2(0.0, stepSize * float(i - center));
#else
        vec2 offset = vec2(stepSize * float(i - center), 0.0);
#endif
        v_textureCoordinates[i] = textureCoordinates + offset;
    }
    
    gl_Position = position;
}
