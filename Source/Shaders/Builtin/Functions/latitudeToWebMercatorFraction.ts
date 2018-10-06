//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_latitudeToWebMercatorFraction(float latitude, float southMercatorY, float oneOverMercatorHeight)\n\
{\n\
float sinLatitude = sin(latitude);\n\
float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));\n\
return (mercatorY - southMercatorY) * oneOverMercatorHeight;\n\
}\n\
";
});