    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component Cartesian vector.\n\
 * The 'oct' encoding is described in \"A Survey of Efficient Representations of Independent Unit Vectors\",\n\
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/\n\
 * \n\
 * @name czm_octDecode\n\
 * @param {vec2} encoded The oct-encoded, unit-length vector\n\
 * @returns {vec3} The decoded and normalized vector\n\
 */\n\
 vec3 czm_octDecode(vec2 encoded)\n\
 {\n\
    encoded = encoded / 255.0 * 2.0 - 1.0;\n\
    vec3 v = vec3(encoded.x, encoded.y, 1.0 - abs(encoded.x) - abs(encoded.y));\n\
    if (v.z < 0.0)\n\
    {\n\
        v.xy = (1.0 - abs(v.yx)) * czm_signNotZero(v.xy);\n\
    }\n\
    \n\
    return normalize(v);\n\
 }\n\
\n\
 /**\n\
 * Decodes a unit-length vector in 'oct' encoding packed into a floating-point number to a normalized 3-component Cartesian vector.\n\
 * The 'oct' encoding is described in \"A Survey of Efficient Representations of Independent Unit Vectors\",\n\
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/\n\
 * \n\
 * @name czm_octDecode\n\
 * @param {float} encoded The oct-encoded, unit-length vector\n\
 * @returns {vec3} The decoded and normalized vector\n\
 */\n\
 vec3 czm_octDecode(float encoded)\n\
 {\n\
    float temp = encoded / 256.0;\n\
    float x = floor(temp);\n\
    float y = (temp - x) * 256.0;\n\
    return czm_octDecode(vec2(x, y));\n\
 }\n\
 \n\
/**\n\
 * Decodes three unit-length vectors in 'oct' encoding packed into two floating-point numbers to normalized 3-component Cartesian vectors.\n\
 * The 'oct' encoding is described in \"A Survey of Efficient Representations of Independent Unit Vectors\",\n\
 * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/\n\
 * \n\
 * @name czm_octDecode\n\
 * @param {vec2} encoded The packed oct-encoded, unit-length vectors.\n\
 * @param {vec3} vector1 One decoded and normalized vector.\n\
 * @param {vec3} vector2 One decoded and normalized vector.\n\
 * @param {vec3} vector3 One decoded and normalized vector.\n\
 */\n\
  void czm_octDecode(vec2 encoded, out vec3 vector1, out vec3 vector2, out vec3 vector3)\n\
 {\n\
    float temp = encoded.x / 65536.0;\n\
    float x = floor(temp);\n\
    float encodedFloat1 = (temp - x) * 65536.0;\n\
\n\
    temp = encoded.y / 65536.0;\n\
    float y = floor(temp);\n\
    float encodedFloat2 = (temp - y) * 65536.0;\n\
\n\
    vector1 = czm_octDecode(encodedFloat1);\n\
    vector2 = czm_octDecode(encodedFloat2);\n\
    vector3 = czm_octDecode(vec2(x, y));\n\
 }\n\
 ";
});