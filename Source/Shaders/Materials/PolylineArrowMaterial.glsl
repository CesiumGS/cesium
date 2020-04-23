#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

uniform vec4 color;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;

    // Fuzz Factor - Controls blurriness of edges
    const float fuzz = 1.2;

    float headLength = 0.75;   // as a percentage of the line's apparent width (not length!)
    float centerAmount = 0.15; // half a percentage of the line's apparent width, maximum value is 0.5.

#ifdef GL_OES_standard_derivatives
    vec2 stPerPixel = fwidth(st);
#else
    float base = 0.025; // 2.5% of the line's length will be the arrow head
    float guess = 0.1; // 10% of the line's width will be considered a pixel.
    vec2 stPerPixel = vec2(base * guess / headLength, guess);
#endif

    // Find the start and end of the blur between the head and the rest.
    float baseLow = 1.0 - headLength * stPerPixel.s / stPerPixel.t;
    float baseHigh = baseLow + fuzz * stPerPixel.s;
    float headOrNot = smoothstep(baseLow, baseHigh, st.s);

    // Find if we're on the center line.
    float distanceFromCenter = abs(st.t - 0.5);
    float centerOrNot = smoothstep(centerAmount, centerAmount + fuzz * stPerPixel.t, distanceFromCenter);

    // Find if we're inside the sloped edges of the head.
    float slope = distanceFromCenter - 0.5 + 0.5 * (st.s - baseLow) / (1.0 - baseLow);
    float slopeHalfFuzz = 0.5 * fuzz * max(stPerPixel.s, stPerPixel.t);
    float slopeOrNot = smoothstep(-slopeHalfFuzz, slopeHalfFuzz, slope);

    // Choose centerOrNot vs. slopeOrNot based on headOrNot.
    float value = 1.0 - mix(centerOrNot, slopeOrNot, headOrNot);

    // Color the line.
    vec4 outColor = vec4(color.rgb, color.a * value);

    outColor = czm_gammaCorrect(outColor);
    material.diffuse = outColor.rgb;
    material.alpha = outColor.a;
    return material;
}
