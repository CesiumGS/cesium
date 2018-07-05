uniform sampler2D colorTexture;
uniform vec3 white;

varying vec2 v_textureCoordinates;

//#ifdef AUTO_EXPOSURE
//uniform sampler2D autoExposure;
//#endif

// See equation 4:
//    http://www.cs.utah.edu/~reinhard/cdrom/tonemap.pdf

void main()
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;
//#ifdef AUTO_EXPOSURE
//    color /= texture2D(autoExposure, vec2(0.5)).r;
//#endif
    color = (color * (1.0 + color / white)) / (1.0 + color);
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
}
