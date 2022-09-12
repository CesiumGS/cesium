uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

void main()
{
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;

#ifdef AUTO_EXPOSURE
    color /= texture2D(autoExposure, vec2(0.5)).r;
#endif
    color = czm_acesTonemapping(color);
    color = czm_inverseGamma(color);

    gl_FragColor = vec4(color, fragmentColor.a);
}
