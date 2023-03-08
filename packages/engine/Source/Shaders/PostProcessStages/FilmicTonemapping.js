//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef AUTO_EXPOSURE\n\
uniform sampler2D autoExposure;\n\
#endif\n\
\n\
// See slides 142 and 143:\n\
//     http://www.gdcvault.com/play/1012459/Uncharted_2__HDR_Lighting\n\
\n\
void main()\n\
{\n\
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);\n\
    vec3 color = fragmentColor.rgb;\n\
\n\
#ifdef AUTO_EXPOSURE\n\
    float exposure = texture2D(autoExposure, vec2(0.5)).r;\n\
    color /= exposure;\n\
#endif\n\
\n\
	const float A = 0.22; // shoulder strength\n\
	const float B = 0.30; // linear strength\n\
	const float C = 0.10; // linear angle\n\
	const float D = 0.20; // toe strength\n\
	const float E = 0.01; // toe numerator\n\
	const float F = 0.30; // toe denominator\n\
\n\
	const float white = 11.2; // linear white point value\n\
\n\
	vec3 c = ((color * (A * color + C * B) + D * E) / (color * ( A * color + B) + D * F)) - E / F;\n\
	float w = ((white * (A * white + C * B) + D * E) / (white * ( A * white + B) + D * F)) - E / F;\n\
\n\
	c = czm_inverseGamma(c / w);\n\
	gl_FragColor = vec4(c, fragmentColor.a);\n\
}\n\
";
