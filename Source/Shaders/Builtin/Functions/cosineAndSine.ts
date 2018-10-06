//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec2 cordic(float angle)\n\
{\n\
vec2 vector = vec2(6.0725293500888267e-1, 0.0);\n\
float sense = (angle < 0.0) ? -1.0 : 1.0;\n\
mat2 rotation = mat2(1.0, sense, -sense, 1.0);\n\
vector = rotation * vector;\n\
angle -= sense * 7.8539816339744828e-1;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
float factor = sense * 5.0e-1;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 4.6364760900080609e-1;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 2.5e-1;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 2.4497866312686414e-1;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.25e-1;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.2435499454676144e-1;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 6.25e-2;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 6.2418809995957350e-2;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 3.125e-2;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 3.1239833430268277e-2;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.5625e-2;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.5623728620476831e-2;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 7.8125e-3;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 7.8123410601011111e-3;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 3.90625e-3;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 3.9062301319669718e-3;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.953125e-3;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.9531225164788188e-3;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 9.765625e-4;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 9.7656218955931946e-4;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 4.8828125e-4;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 4.8828121119489829e-4;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 2.44140625e-4;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 2.4414062014936177e-4;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.220703125e-4;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.2207031189367021e-4;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 6.103515625e-5;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 6.1035156174208773e-5;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 3.0517578125e-5;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 3.0517578115526096e-5;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.52587890625e-5;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.5258789061315762e-5;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 7.62939453125e-6;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 7.6293945311019700e-6;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 3.814697265625e-6;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 3.8146972656064961e-6;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.9073486328125e-6;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 1.9073486328101870e-6;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 9.5367431640625e-7;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 9.5367431640596084e-7;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 4.76837158203125e-7;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 4.7683715820308884e-7;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 2.384185791015625e-7;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
angle -= sense * 2.3841857910155797e-7;\n\
sense = (angle < 0.0) ? -1.0 : 1.0;\n\
factor = sense * 1.1920928955078125e-7;\n\
rotation[0][1] = factor;\n\
rotation[1][0] = -factor;\n\
vector = rotation * vector;\n\
return vector;\n\
}\n\
vec2 czm_cosineAndSine(float angle)\n\
{\n\
if (angle < -czm_piOverTwo || angle > czm_piOverTwo)\n\
{\n\
if (angle < 0.0)\n\
{\n\
return -cordic(angle + czm_pi);\n\
}\n\
else\n\
{\n\
return -cordic(angle - czm_pi);\n\
}\n\
}\n\
else\n\
{\n\
return cordic(angle);\n\
}\n\
}\n\
";
});