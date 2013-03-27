uniform vec4 gridColor;
uniform float holeAlpha;
uniform vec2 lineCount;
uniform vec2 lineThickness;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;

    // Fuzz Factor - Controls blurriness between light and dark colors
    const float fuzz = 0.05;

    float scaledWidth = fract(lineCount.s * st.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));
    float scaledHeight = fract(lineCount.t * st.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));

    vec2 range = 0.5 - (lineThickness * 0.5);
    float value = min(
        1.0 - smoothstep(range.s, range.s + fuzz, scaledWidth),
        1.0 - smoothstep(range.t, range.t + fuzz, scaledHeight));

    material.diffuse = gridColor.rgb;
    material.alpha = gridColor.a * (1.0 - ((1.0 - holeAlpha) * value));

    return material;
}
