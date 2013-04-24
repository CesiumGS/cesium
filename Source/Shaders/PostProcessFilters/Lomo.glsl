uniform sampler2D czm_color;

varying vec2 v_textureCoordinates;

// TODO: expose as uniform
const float vignetteAmount = 1.0;
const float vignetteGamma = 4.0;
const float colorTemperatureShift = 0.2;  // +ve = warmer, -ve = colder
const float saturation = 0.7;
const float finalMultiplier = 1.1;

// TODO: add to BuiltinFunctions.glsl
const float square_root_two = 1.414213562;

// A vignette function based on gamma (i.e. rather than smoothstep)
float gammaVignetteFn(float amount, float gamma)
{
    vec2 normalizedTextureCoordinates = 2.0 * v_textureCoordinates - vec2(1.0);
    float grad = length(normalizedTextureCoordinates) / square_root_two;
    grad = pow(grad, gamma);
    return 1.0 - amount * grad;
}

// TODO: candidate for BuiltInFunctions.glsl
vec3 gamma(vec3 rgb, float gamma)
{
    float g = 1.0 / gamma;
    return pow(rgb, vec3(g));
}

vec3 lomo(vec3 rgb)
{
    float v = gammaVignetteFn(vignetteAmount, vignetteGamma); 
    
    // Gamma the image using the vignette value
    rgb = gamma(rgb, v);

    // Multiply using the vignette value
    rgb *= vec3(v * 0.5 + 0.5);

    // Now apply the equivalent of a PhotoShop Curves S
    rgb = smoothstep(vec3(0), vec3(1), rgb);
    
    // Desaturate
    rgb = czm_saturation(rgb, saturation);
    
    // Adjust color temperature
    float temp = 1.0+colorTemperatureShift;
    rgb = pow(rgb, vec3(1.0/temp, 1.0, temp));

    // Overcrank the values slightly
    rgb *= vec3(finalMultiplier);
    
    return rgb;
}

void main(void)
{
    vec3 rgb = texture2D(czm_color, v_textureCoordinates).rgb;
    
    rgb = lomo(rgb);
    
    gl_FragColor = vec4(rgb, 1.0);
}