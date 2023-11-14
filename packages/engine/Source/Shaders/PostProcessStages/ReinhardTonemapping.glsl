uniform sampler2D colorTexture;

in vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

// See equation 3:
//    http://www.cs.utah.edu/~reinhard/cdrom/tonemap.pdf

void main()
{
    vec4 fragmentColor = texture(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;
#ifdef AUTO_EXPOSURE
    float exposure = texture(autoExposure, vec2(0.5)).r;
    color /= exposure;
#endif
    color = color / (1.0 + color);
    color = czm_inverseGamma(color);
    out_FragColor = vec4(color, fragmentColor.a);
}
