//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "mat2 czm_transpose(mat2 matrix)\n\
{\n\
return mat2(\n\
matrix[0][0], matrix[1][0],\n\
matrix[0][1], matrix[1][1]);\n\
}\n\
mat3 czm_transpose(mat3 matrix)\n\
{\n\
return mat3(\n\
matrix[0][0], matrix[1][0], matrix[2][0],\n\
matrix[0][1], matrix[1][1], matrix[2][1],\n\
matrix[0][2], matrix[1][2], matrix[2][2]);\n\
}\n\
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