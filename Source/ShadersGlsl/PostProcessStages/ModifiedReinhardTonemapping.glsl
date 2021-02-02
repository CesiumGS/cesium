uniform sampler2D colorTexture;
uniform vec3 white;

varying vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#endif

// See equation 4:
//    http://www.cs.utah.edu/~reinhard/cdrom/tonemap.pdf

void main()
{
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;
#ifdef AUTO_EXPOSURE
    float exposure = texture2D(autoExposure, vec2(0.5)).r;
    color /= exposure;
#endif
    color = (color * (1.0 + color / white)) / (1.0 + color);
    color = czm_inverseGamma(color);
    gl_FragColor = vec4(color, fragmentColor.a);
}
