/*global require*/
// require in the complete Cesium object and reassign it globally.
// This is meant for use with the Almond loader.
require([
        'Cesium'
    ], function(
        Cesium) {
    'use strict';
    /*global self,global*/
    if (typeof window !== 'undefined') {
        window.Cesium = Cesium;
    } else if (typeof self !== 'undefined') {
        self.Cesium = Cesium;
    } else if (typeof global !== 'undefined') {
        global.Cesium = Cesium;
    } else {
        console.log('Unable to load Cesium.');
    }
}, undefined, true);
