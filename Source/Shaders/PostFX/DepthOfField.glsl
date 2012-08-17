uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

const float n = 10.0; // camera z near
const float f = 200000.0; // camera z far

// TODO: do not assume full-screen
vec2 u_step = vec2(1.0 / float(agi_viewport.z), 1.0 / float(agi_viewport.w));

// From http://www.geeks3d.com/20091216/geexlab-how-to-visualize-the-depth-buffer-in-glsl/
float LinearizeDepth(vec2 uv)
{
  float z = texture2D(u_depthTexture, uv).x;
  return (2.0 * n) / (f + n - z * (f - n)); 
}

void main(void)
{
    // TODO: camera space
    
    vec3 rgb = texture2D(u_texture, v_textureCoordinates).rgb;
    
    const int KERNEL_WIDTH = 21; // Odd
    const float offset = 10.0;

    float focus = 50000.0 / (f - n);
    float halfRange = 10000.0 / (f - n);
    float farFocus = focus + halfRange;
    float nearFocus = focus - halfRange;
    
    float depth = LinearizeDepth(v_textureCoordinates);
    float difference = abs(depth - focus);
        
    // Perform gaussian blur
    float sum = 0.0;
    vec3 blur = vec3(0.0);
    for (int i = 0; i < KERNEL_WIDTH; ++i)
    {
        for (int j = 0; j < KERNEL_WIDTH; ++j)
        {
            float row = float(i);
            float col = float(j);
            float weightValue = exp2(min(col, float(KERNEL_WIDTH) - col - 1.0) + min(row, float(KERNEL_WIDTH) - row - 1.0));
            sum += weightValue;
            
            vec2 coord = v_textureCoordinates + (vec2(row, col) - offset) * u_step;
            blur += weightValue * texture2D(u_texture, coord).rgb;
        }
    }
    blur /= sum;
    
    if (difference > halfRange) {
        difference = clamp(halfRange * 70.0 * difference, 0.0, 1.0);
    }
    else {
        difference = 0.1;
    }
    
    rgb = mix(rgb, blur, difference);
    gl_FragColor = vec4(rgb, 1.0);
} 
