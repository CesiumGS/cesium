uniform sampler2D u_texture;

uniform float u_avgLuminance;
uniform float u_threshold;
uniform float u_offset;

varying vec2 v_textureCoordinates;

float key(float avg)
{
    float guess = 1.5 - (1.5 / (avg * 0.1 + 1.0));
    return max(0.0, guess) + 0.1;
}

// See section 9. "The bright-pass filter" of Realtime HDR Rendering
// http://www.cg.tuwien.ac.at/research/publications/2007/Luksch_2007_RHR/Luksch_2007_RHR-RealtimeHDR%20.pdf

void main()
{
    vec4 color = texture2D(u_texture, v_textureCoordinates);
    vec3 xyz = czm_RGBToXYZ(color.rgb);
    float luminance = xyz.r;
    
    float scaledLum = key(u_avgLuminance) * luminance / u_avgLuminance;
    float brightLum = max(scaledLum - u_threshold, 0.0);
    float brightness = brightLum / (u_offset + brightLum);
    
    xyz.r = brightness;
    gl_FragColor = vec4(czm_XYZToRGB(xyz), 1.0);
}
