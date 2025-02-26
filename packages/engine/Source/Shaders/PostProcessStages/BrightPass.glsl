uniform sampler2D colorTexture;

uniform float avgLuminance;
uniform float threshold;
uniform float offset;

in vec2 v_textureCoordinates;

float key(float avg)
{
    float guess = 1.5 - (1.5 / (avg * 0.1 + 1.0));
    return max(0.0, guess) + 0.1;
}

// See section 9. "The bright-pass filter" of Realtime HDR Rendering
// http://www.cg.tuwien.ac.at/research/publications/2007/Luksch_2007_RHR/Luksch_2007_RHR-RealtimeHDR%20.pdf

void main()
{
    vec4 color = texture(colorTexture, v_textureCoordinates);
    vec3 xyz = czm_RGBToXYZ(color.rgb);
    float luminance = xyz.r;

    float scaledLum = key(avgLuminance) * luminance / avgLuminance;
    float brightLum = max(scaledLum - threshold, 0.0);
    float brightness = brightLum / (offset + brightLum);

    xyz.r = brightness;
    out_FragColor = vec4(czm_XYZToRGB(xyz), 1.0);
}
