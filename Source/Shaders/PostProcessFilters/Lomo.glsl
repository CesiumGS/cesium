uniform sampler2D czm_color;

varying vec2 v_textureCoordinates;

// TODO: expose as uniforms
const float vignetteAmount = 1.0;
const float vignetteGamma = 4.0;
const float lomoColorTemperature = 4500.0; 
const float lomoSaturation = 0.7;
const float lomoFinalMultiplier = 1.2;

// TODO: add to BuiltinFunctions.glsl
const float square_root_two = 1.414213562;

// A simple gamma function
vec3 gammaCorrect(vec3 rgb, float gamma)
{
    return pow(rgb, vec3(1.0 / gamma));
}

// A vignette function based on gamma (i.e. rather than smoothstep)
float gammaVignette(float amount, float gamma)
{
    vec2 normalizedTextureCoordinates = 2.0 * v_textureCoordinates - vec2(1.0);
    float grad = length(normalizedTextureCoordinates) / square_root_two;
    grad = pow(grad, gamma);
    return 1.0 - amount * grad;
}

// Apply a gamma without increasing saturation
vec3 luminanceGamma(vec3 rgb, float gamma)
{
    float oldLuminance = czm_luminance(rgb);
    float newLuminance = pow(oldLuminance, 1.0 / gamma);
    rgb *= vec3(newLuminance / oldLuminance);
    
    return rgb;
}

// Apply a vignette image filter
vec3 gammaVignetteFilter(vec3 rgb, float amount, float gamma)
{
    float v = gammaVignette(amount, gamma); 
    
    return luminanceGamma(rgb, v);
}

// Adapted from http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
vec3 rgbFromTemperature(float temperatureKelvin)
{
    // Clamp the supported Kelvin temperature range
    if (temperatureKelvin < 1000.0){ temperatureKelvin = 1000.0; }
    if (temperatureKelvin > 40000.0){ temperatureKelvin = 40000.0; } 
    
    temperatureKelvin /= 100.0;
    
    float r, g, b, tmpCalc;
    
    // Red
    if (temperatureKelvin <= 66.0){
        r = 1.0;
    } else {
        tmpCalc = temperatureKelvin - 60.0;
        tmpCalc = 329.698727446 * pow(tmpCalc, -0.1332047592);
        r = tmpCalc / 255.0;
    }
    
    // Green
    if (temperatureKelvin <= 66.0){
        tmpCalc = temperatureKelvin;
        tmpCalc = 99.4708025861 * log(tmpCalc) - 161.1195681661;
        g = tmpCalc / 255.0;
    } else {
        tmpCalc = temperatureKelvin - 60.0;
        tmpCalc = 288.1221695283 * pow(tmpCalc, -0.0755148492);
        g = tmpCalc / 255.0;
    }
    
    // Blue
    if (temperatureKelvin >= 66.0){
        b = 1.0;
    } else if (temperatureKelvin <= 19.0){
        b = 0.0;
    } else {
        tmpCalc = temperatureKelvin - 10.0;
        tmpCalc = 138.5177312231 * log(tmpCalc) - 305.0447927307;
        b = tmpCalc / 255.0;
    }
    
    return clamp(vec3(r, g, b), vec3(0.0), vec3(1.0));
}

// Apply color temperature as a blend
vec3 applyTemperatureA(vec3 rgb, vec3 temperatureRgb)
{
    float sourceLuminance = czm_luminance(rgb);
    
    // Mix with flat Kelvin RGB color
    rgb = mix(rgb, temperatureRgb, vec3(0.5));

    // Mixing with a flat color will have made the image
    // more monochromatic, so let's re-saturate
    rgb = czm_saturation(rgb, 2.0);
    
    // Restore original luminance      
    rgb *= vec3(sourceLuminance / czm_luminance(rgb));
    
    return rgb;
}

// Apply color temperature as a gamma function so whites and blacks are retained
vec3 applyTemperatureB(vec3 rgb, vec3 temperatureRgb)
{
    float oldLuminance = czm_luminance(rgb);
    
    if( oldLuminance < czm_epsilon6){
        return vec3(0.0);
    }
        
    // Apply gamma
    rgb = pow(rgb, vec3(1.0) / temperatureRgb);
      
    float newLuminance = czm_luminance(rgb);

    // Restore original luminance      
    rgb *= vec3(oldLuminance / newLuminance);
      
    return rgb;
}

vec3 colorTemperatureFilter(vec3 rgb, float colorTemperature)
{
    // Work out an RGB value based on color temperature
    vec3 temperatureRgb =  rgbFromTemperature( colorTemperature );

    return applyTemperatureB(rgb, temperatureRgb);
}

// Apply a lomo grade
vec3 lomoGradeFilter(vec3 rgb, float saturation, float colorTemperature, float finalMultiplier)
{
    // Apply the equivalent of a PhotoShop Curves S
    // Note that this will increase saturation
    // TODO: could work out a more direct operation in linear space
    vec3 sRGB = gammaCorrect(rgb, 2.2);
    sRGB = smoothstep(vec3(0.0), vec3(1.0), sRGB);
    rgb = gammaCorrect(sRGB, 1.0 / 2.2);
    
    // Desaturate
    rgb = czm_saturation(rgb, saturation);
    
    // Adjust color temperature
    rgb = colorTemperatureFilter(rgb, colorTemperature);

    // Overcrank the values slightly
    rgb *= vec3(finalMultiplier);
    
    return rgb;
}

void main(void)
{
    // Assume incoming render is largely sRGB aerial imagery.
    vec3 sRGB = texture2D(czm_color, v_textureCoordinates).rgb;

    // Approximate sRGB -> linear
    vec3 rgb = gammaCorrect(sRGB, 1.0 / 2.2);
    
    // Non-perfect lens
    rgb = gammaVignetteFilter(rgb, vignetteAmount, vignetteGamma);
       
    // Film processing / color grading
    rgb = lomoGradeFilter(rgb, lomoSaturation, lomoColorTemperature, lomoFinalMultiplier);
    
    // Approximate linear -> sRGB
    sRGB = gammaCorrect(rgb, 2.2);
    
    gl_FragColor = vec4(sRGB, 1.0);
}