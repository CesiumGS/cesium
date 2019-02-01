/*eslint-env node,es6*/
'use strict';

var path = require('path');
var requirejs = require('requirejs');

//In explicit development mode, use un-optimized requirejs modules for improved error checking.
if (process.env.NODE_ENV === 'development') {
    requirejs.config({
        paths: {
            'Cesium': path.join(__dirname, 'Source')
        },
        nodeRequire: require
    });
    module.exports = requirejs('Cesium/Cesium');
    return;
}

//In all other cases, use minified Cesium for performance.
requirejs.config({
    paths: {
        'Cesium': path.join(__dirname, 'Build/Cesium/Cesium')
    },
    nodeRequire: require
});

const hadCesiumProperty = global.hasOwnProperty('Cesium');
const oldCesium = global.Cesium;

requirejs('Cesium');
module.exports = global.Cesium;

if (hadCesiumProperty) {
    global.Cesium = oldCesium;
} else {
    delete global.Cesium;
}
