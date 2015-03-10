    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Returns the transpose of the matrix.  The input <code>matrix</code> can be \n\
 * a <code>mat2</code>, <code>mat3</code>, or <code>mat4</code>.\n\
 *\n\
 * @name czm_transpose\n\
 * @glslFunction\n\
 *\n\
 * @param {} matrix The matrix to transpose.\n\
 *\n\
 * @returns {} The transposed matrix.\n\
 *\n\
 * @example\n\
 * // GLSL declarations\n\
 * mat2 czm_transpose(mat2 matrix);\n\
 * mat3 czm_transpose(mat3 matrix);\n\
 * mat4 czm_transpose(mat4 matrix);\n\
 *\n\
 * // Tranpose a 3x3 rotation matrix to find its inverse.\n\
 * mat3 eastNorthUpToEye = czm_eastNorthUpToEyeCoordinates(\n\
 *     positionMC, normalEC);\n\
 * mat3 eyeToEastNorthUp = czm_transpose(eastNorthUpToEye);\n\
 */\n\
mat2 czm_transpose(mat2 matrix)\n\
{\n\
    return mat2(\n\
        matrix[0][0], matrix[1][0],\n\
        matrix[0][1], matrix[1][1]);\n\
}\n\
\n\
mat3 czm_transpose(mat3 matrix)\n\
{\n\
    return mat3(\n\
        matrix[0][0], matrix[1][0], matrix[2][0],\n\
        matrix[0][1], matrix[1][1], matrix[2][1],\n\
        matrix[0][2], matrix[1][2], matrix[2][2]);\n\
}\n\
\n\
mat4 czm_transpose(mat4 matrix)\n\
{\n\
    return mat4(\n\
        matrix[0][0], matrix[1][0], matrix[2][0], matrix[3][0],\n\
        matrix[0][1], matrix[1][1], matrix[2][1], matrix[3][1],\n\
        matrix[0][2], matrix[1][2], matrix[2][2], matrix[3][2],\n\
        matrix[0][3], matrix[1][3], matrix[2][3], matrix[3][3]);\n\
}\n\
";
});