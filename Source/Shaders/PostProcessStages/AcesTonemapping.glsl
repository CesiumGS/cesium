uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

// See:
//    https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/

void main()
{
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;

#ifdef AUTO_EXPOSURE
    color /= texture2D(autoExposure, vec2(0.5)).r;
#endif
    color = czm_acestoneMapping(color);
    gl_FragColor = vec4(color, fragmentColor.a);
}
