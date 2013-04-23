uniform vec4 color;
uniform vec4 innerColor;
uniform float innerWidth;

varying float v_width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;
    float halfInteriorWidth =  0.5 * innerWidth / v_width;
    float halfGlowWidth =  0.5 * (v_width - innerWidth) / v_width;
    float b = step(0.5 - halfInteriorWidth, st.t);
    b *= 1.0 - step(0.5 + halfInteriorWidth, st.t);

    // Find the distance from the closest separator (region between two colors)
    float d1 = abs(st.t - (0.5 - halfInteriorWidth));
    float d2 = abs(st.t - (0.5 + halfInteriorWidth));
    float dist = min(d1, d2);

    vec4 innerGradient = mix(color, innerColor, dist / halfInteriorWidth);
    vec4 outerGradient = vec4(color.rgb, color.a * (1.0 - dist / halfGlowWidth));
    vec4 outColor = mix(outerGradient, innerGradient, b);

    material.emission = outColor.rgb;
    material.alpha = outColor.a;

    return material;
}
