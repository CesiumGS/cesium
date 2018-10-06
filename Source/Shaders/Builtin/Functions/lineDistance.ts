//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_lineDistance(vec2 point1, vec2 point2, vec2 point) {\n\
return abs((point2.y - point1.y) * point.x - (point2.x - point1.x) * point.y + point2.x * point1.y - point2.y * point1.x) / distance(point2, point1);\n\
}\n\
";
});