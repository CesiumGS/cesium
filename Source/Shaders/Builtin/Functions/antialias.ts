//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist, float fuzzFactor)\n\
{\n\
float val1 = clamp(dist / fuzzFactor, 0.0, 1.0);\n\
float val2 = clamp((dist - 0.5) / fuzzFactor, 0.0, 1.0);\n\
val1 = val1 * (1.0 - val2);\n\
val1 = val1 * val1 * (3.0 - (2.0 * val1));\n\
val1 = pow(val1, 0.5);\n\
vec4 midColor = (color1 + color2) * 0.5;\n\
return mix(midColor, currentColor, val1);\n\
}\n\
vec4 czm_antialias(vec4 color1, vec4 color2, vec4 currentColor, float dist)\n\
{\n\
return czm_antialias(color1, color2, currentColor, dist, 0.1);\n\
}\n\
";
});