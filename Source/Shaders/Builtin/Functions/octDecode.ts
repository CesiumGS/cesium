//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_octDecode(vec2 encoded, float range)\n\
{\n\
if (encoded.x == 0.0 && encoded.y == 0.0) {\n\
return vec3(0.0, 0.0, 0.0);\n\
}\n\
encoded = encoded / range * 2.0 - 1.0;\n\
vec3 v = vec3(encoded.x, encoded.y, 1.0 - abs(encoded.x) - abs(encoded.y));\n\
if (v.z < 0.0)\n\
{\n\
v.xy = (1.0 - abs(v.yx)) * czm_signNotZero(v.xy);\n\
}\n\
return normalize(v);\n\
}\n\
vec3 czm_octDecode(vec2 encoded)\n\
{\n\
return czm_octDecode(encoded, 255.0);\n\
}\n\
vec3 czm_octDecode(float encoded)\n\
{\n\
float temp = encoded / 256.0;\n\
float x = floor(temp);\n\
float y = (temp - x) * 256.0;\n\
return czm_octDecode(vec2(x, y));\n\
}\n\
void czm_octDecode(vec2 encoded, out vec3 vector1, out vec3 vector2, out vec3 vector3)\n\
{\n\
float temp = encoded.x / 65536.0;\n\
float x = floor(temp);\n\
float encodedFloat1 = (temp - x) * 65536.0;\n\
temp = encoded.y / 65536.0;\n\
float y = floor(temp);\n\
float encodedFloat2 = (temp - y) * 65536.0;\n\
vector1 = czm_octDecode(encodedFloat1);\n\
vector2 = czm_octDecode(encodedFloat2);\n\
vector3 = czm_octDecode(vec2(x, y));\n\
}\n\
";
});