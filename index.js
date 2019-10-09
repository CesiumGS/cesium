/*eslint-env node,es6*/
'use strict';

var path = require('path');

// If in 'production' mode, use the combined/minified/optimized version of Cesium
if (process.env.NODE_ENV === 'production') {
    module.exports = require(path.join(__dirname, 'Build/Cesium/Cesium'));
    return;
}

// Otherwise, use un-optimized requirejs modules for improved error checking. For example 'development' mode
var requirejs = require('requirejs');
requirejs.config({
    paths: {
        'Cesium': path.join(__dirname, 'Source')
    },
    nodeRequire: require
});

module.exports = requirejs('Cesium/Cesium');
