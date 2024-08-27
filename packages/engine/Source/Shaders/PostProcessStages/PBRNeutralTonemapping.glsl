// KhronosGroup https://github.com/KhronosGroup/ToneMapping/tree/main/PBR_Neutral

// Input color is non-negative and resides in the Linear Rec. 709 color space.
// Output color is also Linear Rec. 709, but in the [0, 1] range.

vec3 PBRNeutralToneMapping( vec3 color ) {
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;

    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;

    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) return color;

    const float d = 1.0 - startCompression;
    float newPeak = 1.0 - d * d / (peak + d - startCompression);
    color *= newPeak / peak;

    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    return mix(color, newPeak * vec3(1, 1, 1), g);
}

uniform sampler2D colorTexture;

in vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

void main()
{
    vec4 fragmentColor = texture(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;

#ifdef AUTO_EXPOSURE
    color /= texture(autoExposure, vec2(0.5)).r;
#endif
    color = PBRNeutralToneMapping(color);
    color = czm_inverseGamma(color);

    out_FragColor = vec4(color, fragmentColor.a);
}
