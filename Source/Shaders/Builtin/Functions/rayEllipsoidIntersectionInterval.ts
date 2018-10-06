//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "czm_raySegment czm_rayEllipsoidIntersectionInterval(czm_ray ray, czm_ellipsoid ellipsoid)\n\
{\n\
vec3 q = ellipsoid.inverseRadii * (czm_inverseModelView * vec4(ray.origin, 1.0)).xyz;\n\
vec3 w = ellipsoid.inverseRadii * (czm_inverseModelView * vec4(ray.direction, 0.0)).xyz;\n\
q = q - ellipsoid.inverseRadii * (czm_inverseModelView * vec4(ellipsoid.center, 1.0)).xyz;\n\
float q2 = dot(q, q);\n\
float qw = dot(q, w);\n\
if (q2 > 1.0)\n\
{\n\
if (qw >= 0.0)\n\
{\n\
return czm_emptyRaySegment;\n\
}\n\
else\n\
{\n\
float qw2 = qw * qw;\n\
float difference = q2 - 1.0;\n\
float w2 = dot(w, w);\n\
float product = w2 * difference;\n\
if (qw2 < product)\n\
{\n\
return czm_emptyRaySegment;\n\
}\n\
else if (qw2 > product)\n\
{\n\
float discriminant = qw * qw - product;\n\
float temp = -qw + sqrt(discriminant);\n\
float root0 = temp / w2;\n\
float root1 = difference / temp;\n\
if (root0 < root1)\n\
{\n\
czm_raySegment i = czm_raySegment(root0, root1);\n\
return i;\n\
}\n\
else\n\
{\n\
czm_raySegment i = czm_raySegment(root1, root0);\n\
return i;\n\
}\n\
}\n\
else\n\
{\n\
float root = sqrt(difference / w2);\n\
czm_raySegment i = czm_raySegment(root, root);\n\
return i;\n\
}\n\
}\n\
}\n\
else if (q2 < 1.0)\n\
{\n\
float difference = q2 - 1.0;\n\
float w2 = dot(w, w);\n\
float product = w2 * difference;\n\
float discriminant = qw * qw - product;\n\
float temp = -qw + sqrt(discriminant);\n\
czm_raySegment i = czm_raySegment(0.0, temp / w2);\n\
return i;\n\
}\n\
else\n\
{\n\
if (qw < 0.0)\n\
{\n\
float w2 = dot(w, w);\n\
czm_raySegment i = czm_raySegment(0.0, -qw / w2);\n\
return i;\n\
}\n\
else\n\
{\n\
return czm_emptyRaySegment;\n\
}\n\
}\n\
}\n\
";
});