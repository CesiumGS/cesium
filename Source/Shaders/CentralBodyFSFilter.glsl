#define KERNEL_SIZE 7

uniform sampler2D u_texture;

varying vec2 v_textureCoordinates[KERNEL_SIZE];

void main()
{
    float kernel[KERNEL_SIZE];
    // for 7x7 kernel
    kernel[0] = 8.0;
    kernel[1] = 28.0;
    kernel[2] = 56.0;
    kernel[3] = 70.0;
    kernel[4] = 56.0;
    kernel[5] = 28.0;
    kernel[6] = 8.0;
    
    /*
    // for 5x5 kernel
    kernel[0] = 6.0;
    kernel[1] = 15.0;
    kernel[2] = 20.0;
    kernel[3] = 15.0;
    kernel[4] = 6.0;
    */
    
    /*
    // for 3x3 kernel
    kernel[0] = 4.0;
    kernel[1] = 6.0;
    kernel[2] = 4.0;
    */
    
    vec4 color = texture2D(u_texture, v_textureCoordinates[KERNEL_SIZE / 2]);
    
    if (color.w == 0.0) {
        vec4 startColor = texture2D(u_texture, v_textureCoordinates[0]);
        vec4 endColor = texture2D(u_texture, v_textureCoordinates[KERNEL_SIZE - 1]);
        
        if (startColor.w != 0.0 && endColor.w != 0.0) {
            float startWeight = kernel[0];
            float endWeight = kernel[KERNEL_SIZE - 1];
            
            color = startWeight * startColor + endWeight * endColor;
            float sum = startWeight + endWeight;
            
            for (int i = 1; i < KERNEL_SIZE - 1; i++) {
                if (i != KERNEL_SIZE / 2) {
                    float weight = kernel[i];
                    vec4 tex = texture2D(u_texture, v_textureCoordinates[i]);
                    color += tex.a * weight * tex;
                    sum += tex.a * weight;
                }
            }
            color /= sum;
        }
    }
    
    gl_FragColor = color;
}
