/**
 * Procedural anti-aliasing by blurring two colors that meet at a sharp edge.
 *
 * @name czm_antialias
 * @glslFunction
 *
 * @param {vec4} color1 The color on one side of the edge.
 * @param {vec4} color2 The color on the other side of the edge.
 * @param {vec4} currentcolor The current color, either <code>color1</code> or <code>color2</code>.
 * @param {float} dist The distance to the edge in texture coordinates.
 * @param {float} [fuzzFactor=0.1] Controls the blurriness between the two colors.
 * @returns {vec4} The anti-aliased color.
 *
 * @example
 * // GLSL declarations
 * vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist, float fuzzFactor);
 * vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist);
 *
 * // get the color for a material that has a sharp edge at the line y = 0.5 in texture space
 * float dist = abs(textureCoordinates.t - 0.5);
 * vec4 currentColor = mix(bottomColor, topColor, step(0.5, textureCoordinates.t));
 * vec4 color = czm_antialias(bottomColor, topColor, currentColor, dist, 0.1);
 */
vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist, float fuzzFactor)
{
    float val1 = clamp(dist / fuzzFactor, 0.0, 1.0);
    float val2 = clamp((dist - 0.5) / fuzzFactor, 0.0, 1.0);
    val1 = val1 * (1.0 - val2);
    val1 = val1 * val1 * (3.0 - (2.0 * val1));
    val1 = pow(val1, 0.5); //makes the transition nicer
    
    vec4 midColor = (color1 + color2) * 0.5;
    return mix(midColor, currentColor, val1);
}

vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist)
{
    return czm_antialias(color1, color2, currentColor, dist, 0.1);
}
