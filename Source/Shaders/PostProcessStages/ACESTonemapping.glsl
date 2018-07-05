uniform sampler2D colorTexture;

varying vec2 v_textureCoordinates;

//#ifdef AUTO_EXPOSURE
//uniform sampler2D autoExposure;
//#endif

void main()
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;

//#ifdef AUTO_EXPOSURE
//    color /= texture2D(autoExposure, vec2(0.5)).r;
//#endif

    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    color = (color * (a * color + b)) / (color * (c * color + d) + e);
    color = clamp(color, 0.0, 1.0);
    color = pow(color, vec3(1.0 / 2.2));
    gl_FragColor = vec4(color, 1.0);
}
