uniform sampler2D colorTexture;
uniform vec3 white;

in vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#else
uniform float exposure;
#endif

// See equation 4:
//    http://www.cs.utah.edu/~reinhard/cdrom/tonemap.pdf

void main()
{
    vec4 fragmentColor = texture(colorTexture, v_textureCoordinates);
    vec3 color = fragmentColor.rgb;
#ifdef AUTO_EXPOSURE
    float exposure = texture(autoExposure, vec2(0.5)).r;
    color /= exposure;
#else
    color *= vec3(exposure);
#endif
    color = (color * (1.0 + color / white)) / (1.0 + color);
    color = czm_inverseGamma(color);
    out_FragColor = vec4(color, fragmentColor.a);
}
