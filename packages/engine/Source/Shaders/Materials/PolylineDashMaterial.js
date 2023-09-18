//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 color;\n\
uniform vec4 gapColor;\n\
uniform float dashLength;\n\
uniform float dashPattern;\n\
in float v_polylineAngle;\n\
\n\
const float maskLength = 16.0;\n\
\n\
mat2 rotate(float rad) {\n\
    float c = cos(rad);\n\
    float s = sin(rad);\n\
    return mat2(\n\
        c, s,\n\
        -s, c\n\
    );\n\
}\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;\n\
\n\
    // Get the relative position within the dash from 0 to 1\n\
    float dashPosition = fract(pos.x / (dashLength * czm_pixelRatio));\n\
    // Figure out the mask index.\n\
    float maskIndex = floor(dashPosition * maskLength);\n\
    // Test the bit mask.\n\
    float maskTest = floor(dashPattern / pow(2.0, maskIndex));\n\
    vec4 fragColor = (mod(maskTest, 2.0) < 1.0) ? gapColor : color;\n\
    if (fragColor.a < 0.005) {   // matches 0/255 and 1/255\n\
        discard;\n\
    }\n\
\n\
    fragColor = czm_gammaCorrect(fragColor);\n\
    material.emission = fragColor.rgb;\n\
    material.alpha = fragColor.a;\n\
    return material;\n\
}\n\
";
