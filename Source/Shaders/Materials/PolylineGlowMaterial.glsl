varying vec4 v_color;
varying float v_width;

float dropOffFunction(float value)
{
    return value * value;
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec2 st = materialInput.st;
    float halfInteriorWidth = 1.0 / v_width;
    float s = (1.0 - step(0.5 - halfInteriorWidth, st.t)) * dropOffFunction(1.0 - st.t);
    s += step(0.5 + halfInteriorWidth, st.t) * dropOffFunction(st.t);
    float alpha = mix(0.1, 1.0, 1.0 - s);
    
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
    
    vec4 currentColor = vec4(mix(vec3(0.0), v_color.rgb, 2.0), alpha);
    vec4 midColor = (currentColor + v_color) * 0.5;
    vec4 color = mix(midColor, currentColor, val1);
    
    material.emission = color.rgb;
    material.alpha = color.a;
    return material;
}
