uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

// See:
//    https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/

void main()
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;

#ifdef AUTO_EXPOSURE
    color /= texture2D(autoExposure, vec2(0.5)).r;
#endif
    float g = 0.985;

    float a = 0.065;
    float b = 0.0001;
    float c = 0.433;
    float d = 0.238;

    color = (color * (color + a) - b) / (color * (g * color + c) + d);

    color = clamp(color, 0.0, 1.0);
    color = czm_inverseGamma(color);
    gl_FragColor = vec4(color, 1.0);
}
