//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_fastApproximateAtan(float x) {\n\
return x * (-0.1784 * x - 0.0663 * x * x + 1.0301);\n\
}\n\
float czm_fastApproximateAtan(float x, float y) {\n\
float t = abs(x);\n\
float opposite = abs(y);\n\
float adjacent = max(t, opposite);\n\
opposite = min(t, opposite);\n\
t = czm_fastApproximateAtan(opposite / adjacent);\n\
t = czm_branchFreeTernary(abs(y) > abs(x), czm_piOverTwo - t, t);\n\
t = czm_branchFreeTernary(x < 0.0, czm_pi - t, t);\n\
t = czm_branchFreeTernary(y < 0.0, -t, t);\n\
return t;\n\
}\n\
";
});