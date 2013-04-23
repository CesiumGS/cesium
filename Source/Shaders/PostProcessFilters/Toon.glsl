uniform sampler2D czm_colorTexture;

varying vec2 v_textureCoordinates;

const int KERNEL_WIDTH = 3; // Odd
const float offset = 1.0;

void main(void)
{
// TODO: do not assume full-screen
    vec2 u_step = vec2(1.0 / czm_viewport.z, 1.0 / czm_viewport.w);

    float weightsH[9];  // Row major, bottom to top
    weightsH[0] = 1.0;
    weightsH[1] = 2.0;
    weightsH[2] = 1.0;

    weightsH[3] = 0.0;
    weightsH[4] = 0.0;
    weightsH[5] = 0.0;

    weightsH[6] = -1.0;
    weightsH[7] = -2.0;
    weightsH[8] = -1.0;

    float weightsV[9];  // Row major, bottom to top
    weightsV[0] = -1.0;
    weightsV[1] =  0.0;
    weightsV[2] =  1.0;

    weightsV[3] = -2.0;
    weightsV[4] =  0.0;
    weightsV[5] =  2.0;

    weightsV[6] = -1.0;
    weightsV[7] =  0.0;
    weightsV[8] =  1.0;

    float accumH = 0.0;
    float accumV = 0.0;

    for (int j = 0; j < KERNEL_WIDTH; ++j)  // Bottom row to top
    {
        for (int i = 0; i < KERNEL_WIDTH; ++i)
        {
            vec2 coord = vec2(v_textureCoordinates.s + ((float(i) - offset) * u_step.s), v_textureCoordinates.t + ((float(j) - offset) * u_step.t));
            vec3 rgb = texture2D(czm_colorTexture, coord).rgb;
            float luminance = czm_luminance(rgb);

            accumH += weightsH[j * KERNEL_WIDTH + i] * luminance;
            accumV += weightsV[j * KERNEL_WIDTH + i] * luminance;
        }
    }   

    if (length(vec2(accumH, accumV)) > 0.1)
    {
        gl_FragColor = vec4(vec3(0.0), 1.0);
    }
    else
    {
        float quantize = 4.0;
        
        vec3 rgb = texture2D(czm_colorTexture, v_textureCoordinates).rgb;
        rgb *= quantize;
        rgb += vec3(0.5);
        ivec3 irgb = ivec3(rgb);
        rgb = vec3(irgb) / quantize;

        gl_FragColor = vec4(rgb, 1.0);
    }
}