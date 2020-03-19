/*eslint-env node*/
'use strict';

var path = require('path');

// If in 'production' mode, use the combined/minified/optimized version of Cesium
if (process.env.NODE_ENV === 'production') {
    module.exports = require(path.join(__dirname, 'Build/Cesium/Cesium'));
} else {
    module.exports = require(path.join(__dirname, 'Build/CesiumUnminified/Cesium'));
}
