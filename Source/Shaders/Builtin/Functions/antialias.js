    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Procedural anti-aliasing by blurring two colors that meet at a sharp edge.\n\
 *\n\
 * @name czm_antialias\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} color1 The color on one side of the edge.\n\
 * @param {vec4} color2 The color on the other side of the edge.\n\
 * @param {vec4} currentcolor The current color, either <code>color1</code> or <code>color2</code>.\n\
 * @param {float} dist The distance to the edge in texture coordinates.\n\
 * @param {float} [fuzzFactor=0.1] Controls the blurriness between the two colors.\n\
 * @returns {vec4} The anti-aliased color.\n\
 *\n\
 * @example\n\
 * // GLSL declarations\n\
 * vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist, float fuzzFactor);\n\
 * vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist);\n\
 *\n\
 * // get the color for a material that has a sharp edge at the line y = 0.5 in texture space\n\
 * float dist = abs(textureCoordinates.t - 0.5);\n\
 * vec4 currentColor = mix(bottomColor, topColor, step(0.5, textureCoordinates.t));\n\
 * vec4 color = czm_antialias(bottomColor, topColor, currentColor, dist, 0.1);\n\
 */\n\
vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist, float fuzzFactor)\n\
{\n\
    float val1 = clamp(dist / fuzzFactor, 0.0, 1.0);\n\
    float val2 = clamp((dist - 0.5) / fuzzFactor, 0.0, 1.0);\n\
    val1 = val1 * (1.0 - val2);\n\
    val1 = val1 * val1 * (3.0 - (2.0 * val1));\n\
    val1 = pow(val1, 0.5); //makes the transition nicer\n\
    \n\
    vec4 midColor = (color1 + color2) * 0.5;\n\
    return mix(midColor, currentColor, val1);\n\
}\n\
\n\
vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist)\n\
{\n\
    return czm_antialias(color1, color2, currentColor, dist, 0.1);\n\
}\n\
";
});