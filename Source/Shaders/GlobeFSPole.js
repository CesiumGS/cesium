    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform vec3 u_color;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    // TODO: make arbitrary ellipsoid\n\
    czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();\n\
    vec3 direction = normalize(czm_windowToEyeCoordinates(gl_FragCoord).xyz);\n\
    czm_ray ray = czm_ray(vec3(0.0), direction);\n\
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);\n\
    \n\
    if (!czm_isEmpty(intersection))\n\
    {\n\
        vec3 positionEC = czm_pointAlongRay(ray, intersection.start);\n\
        vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;\n\
	    \n\
	    vec3 normalMC = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), vec3(1.0)));\n\
	    vec3 normalEC = normalize(czm_normal * normalMC);\n\
	    \n\
        vec3 startDayColor = u_color;\n\
		\n\
        gl_FragColor = vec4(startDayColor, 1.0);\n\
    }\n\
    else\n\
    {\n\
        discard;\n\
    }\n\
}";
});