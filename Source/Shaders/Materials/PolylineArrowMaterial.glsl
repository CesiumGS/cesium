#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

uniform vec4 color;
uniform vec4 outlineColor;
uniform float outlineWidth;

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

    // Outline width in st coordinates
    vec2 outlineSt = outlineWidth * stPerPixel;
#else
    float base = 0.025; // 2.5% of the line's length will be the arrow head
    float guess = 0.1; // 10% of the line's width will be considered a pixel.
    vec2 stPerPixel = vec2(base * guess / headLength, guess);
    vec2 outlineSt = vec2(0.0);
#endif

    // Find the start and end of the blur between the head and the rest.
    float baseLow = max(0.5, 1.0 - headLength * stPerPixel.s / stPerPixel.t);
    float baseHigh = baseLow + fuzz * stPerPixel.s;
    float headOrNot = smoothstep(baseLow, baseHigh, st.s);
    float innerHeadOrNot = smoothstep(baseLow + outlineSt.s, baseHigh + outlineSt.s, st.s);

    // Find if we're on the center line.
    float distanceFromCenter = abs(st.t - 0.5);
    float centerHigh = centerAmount + fuzz * stPerPixel.t;
    float centerOrNot = 1.0 - smoothstep(centerAmount, centerHigh, distanceFromCenter);
    float innerCenterOrNot = 1.0 - smoothstep(centerAmount - outlineSt.t, centerHigh - outlineSt.t, distanceFromCenter);

    // Find if we're inside the sloped edges of the head.
    float slope =  0.5 - 0.5 * (st.s - baseLow) / (1.0 - baseLow) - distanceFromCenter;
    float slopeHalfFuzz = 0.5 * fuzz * max(stPerPixel.s, stPerPixel.t);
    float slopeOrNot = smoothstep(-slopeHalfFuzz, slopeHalfFuzz, slope);
    float innerSlopeOffset = outlineSt.t + outlineSt.s * 0.5;
    float innerSlopeOrNot = smoothstep(-slopeHalfFuzz + innerSlopeOffset, slopeHalfFuzz + innerSlopeOffset, slope);

    // Choose centerOrNot vs. slopeOrNot based on headOrNot.
    float value = mix(centerOrNot, slopeOrNot, headOrNot);
    float innerValue = mix(innerCenterOrNot, innerSlopeOrNot, innerHeadOrNot);

    // End cap at the back
    innerValue *= smoothstep(outlineSt.s, outlineSt.s + fuzz * stPerPixel.s, st.s);

    // Color the outline, then the inner line.
    vec4 outColor = vec4(outlineColor.rgb, outlineColor.a * value);
    outColor = mix(outColor, color, innerValue);

    outColor = czm_gammaCorrect(outColor);
    material.diffuse = outColor.rgb;
    material.alpha = outColor.a;
    return material;
}
