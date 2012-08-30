/*global require*/
// require in the complete Cesium object and reassign it globally.
// This is meant for use with the Almond loader.
require(['Cesium'], function(Cesium) {
    "use strict";
    /*global self*/

    Cesium.defaultValue(window, self).Cesium = Cesium;
}, undefined, true);