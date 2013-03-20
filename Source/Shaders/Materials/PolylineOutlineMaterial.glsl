uniform vec4 color;
uniform vec4 outlineColor;
uniform float outlineWidth;

varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec2 st = materialInput.st;
    float halfInteriorWidth =  0.5 * (v_width - outlineWidth) / v_width;
    float b = step(0.5 - halfInteriorWidth, st.t);
    b *= 1.0 - step(0.5 + halfInteriorWidth, st.t);
    
    // Find the distance from the closest separator (region between two colors)
    float d1 = abs(st.t - (0.5 - halfInteriorWidth));
    float d2 = abs(st.t - (0.5 + halfInteriorWidth));
    float value = min(d1, d2);
    
    //anti-aliasing
    const float fuzz = 0.1;
    float val1 = clamp(value / fuzz, 0.0, 1.0);
    float val2 = clamp((value - 0.5) / fuzz, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));
    val1 = pow(val1, 0.5); //makes the transition nicer
    
    vec4 midColor = (outlineColor + color) * 0.5;
    vec4 currentColor = mix(outlineColor, color, b);
    vec4 outColor = mix(midColor, currentColor, val1);
    
    material.diffuse = outColor.rgb;
    material.alpha = outColor.a;
    
    return material;
}
