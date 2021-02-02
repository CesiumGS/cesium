//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef AUTO_EXPOSURE\n\
uniform sampler2D autoExposure;\n\
#endif\n\
\n\
// See equation 3:\n\
//    http://www.cs.utah.edu/~reinhard/cdrom/tonemap.pdf\n\
\n\
void main()\n\
{\n\
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);\n\
    vec3 color = fragmentColor.rgb;\n\
#ifdef AUTO_EXPOSURE\n\
    float exposure = texture2D(autoExposure, vec2(0.5)).r;\n\
    color /= exposure;\n\
#endif\n\
    color = color / (1.0 + color);\n\
    color = czm_inverseGamma(color);\n\
    gl_FragColor = vec4(color, fragmentColor.a);\n\
}\n\
";
