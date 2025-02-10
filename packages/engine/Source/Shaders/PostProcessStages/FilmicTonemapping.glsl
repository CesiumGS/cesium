uniform sampler2D colorTexture;

in vec2 v_textureCoordinates;

#ifdef AUTO_EXPOSURE
uniform sampler2D autoExposure;
#else
uniform float exposure;
#endif

// See slides 142 and 143:
//     http://www.gdcvault.com/play/1012459/Uncharted_2__HDR_Lighting

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

	const float A = 0.22; // shoulder strength
	const float B = 0.30; // linear strength
	const float C = 0.10; // linear angle
	const float D = 0.20; // toe strength
	const float E = 0.01; // toe numerator
	const float F = 0.30; // toe denominator

	const float white = 11.2; // linear white point value

	vec3 c = ((color * (A * color + C * B) + D * E) / (color * ( A * color + B) + D * F)) - E / F;
	float w = ((white * (A * white + C * B) + D * E) / (white * ( A * white + B) + D * F)) - E / F;

	c = czm_inverseGamma(c / w);
	out_FragColor = vec4(c, fragmentColor.a);
}
