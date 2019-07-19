//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Computes distance from an point in 2D to a line in 2D.\n\
 *\n\
 * @name czm_lineDistance\n\
 * @glslFunction\n\
 *\n\
 * param {vec2} point1 A point along the line.\n\
 * param {vec2} point2 A point along the line.\n\
 * param {vec2} point A point that may or may not be on the line.\n\
 * returns {float} The distance from the point to the line.\n\
 */\n\
float czm_lineDistance(vec2 point1, vec2 point2, vec2 point) {\n\
    return abs((point2.y - point1.y) * point.x - (point2.x - point1.x) * point.y + point2.x * point1.y - point2.y * point1.x) / distance(point2, point1);\n\
}\n\
";
});