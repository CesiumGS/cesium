//This file is automatically rebuilt by the Cesium build process.
export default "// See:\n\
//    https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/\n\
\n\
vec3 czm_acesTonemapping(vec3 color) {\n\
    float g = 0.985;\n\
    float a = 0.065;\n\
    float b = 0.0001;\n\
    float c = 0.433;\n\
    float d = 0.238;\n\
\n\
    color = (color * (color + a) - b) / (color * (g * color + c) + d);\n\
\n\
    color = clamp(color, 0.0, 1.0);\n\
\n\
    return color;\n\
}\n\
";
