#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
#endif

uniform vec4 color;
uniform float cellAlpha;
uniform vec2 lineCount;
uniform vec2 lineThickness;
uniform vec2 lineOffset;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st;

    float scaledWidth = fract(lineCount.s * st.s - lineOffset.s);
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));
    float scaledHeight = fract(lineCount.t * st.t - lineOffset.t);
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));

    float value;
#ifdef GL_OES_standard_derivatives
    // Fuzz Factor - Controls blurriness of lines
    const float fuzz = 1.2;
    vec2 thickness = (lineThickness * czm_resolutionScale) - 1.0;

    // From "3D Engine Design for Virtual Globes" by Cozzi and Ring, Listing 4.13.
    vec2 dx = abs(dFdx(st));
    vec2 dy = abs(dFdy(st));
    vec2 dF = vec2(max(dx.s, dy.s), max(dx.t, dy.t)) * lineCount;
    value = min(
        smoothstep(dF.s * thickness.s, dF.s * (fuzz + thickness.s), scaledWidth),
        smoothstep(dF.t * thickness.t, dF.t * (fuzz + thickness.t), scaledHeight));
#else
    // Fuzz Factor - Controls blurriness of lines
    const float fuzz = 0.05;

    vec2 range = 0.5 - (lineThickness * 0.05);
    value = min(
        1.0 - smoothstep(range.s, range.s + fuzz, scaledWidth),
        1.0 - smoothstep(range.t, range.t + fuzz, scaledHeight));
#endif

    // Edges taken from RimLightingMaterial.glsl
    // See http://www.fundza.com/rman_shaders/surface/fake_rim/fake_rim1.html
    float dRim = 1.0 - abs(dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC)));
    float sRim = smoothstep(0.8, 1.0, dRim);
    value *= (1.0 - sRim);

    vec4 halfColor;
    halfColor.rgb = color.rgb * 0.5;
    halfColor.a = color.a * (1.0 - ((1.0 - cellAlpha) * value));
    halfColor = czm_gammaCorrect(halfColor);
    material.diffuse = halfColor.rgb;
    material.emission = halfColor.rgb;
    material.alpha = halfColor.a;

    return material;
}
