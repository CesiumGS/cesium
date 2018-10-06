//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_pointAlongRay(czm_ray ray, float time)\n\
{\n\
return ray.origin + (time * ray.direction);\n\
}\n\
";
});