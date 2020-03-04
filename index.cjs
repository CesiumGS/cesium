/*eslint-env node*/
'use strict';

var path = require('path');
debugger;
// If in 'production' mode, use the combined/minified/optimized version of Cesium
if (process.env.NODE_ENV === 'production') {
    console.log('prod');
    module.exports = require(path.join(__dirname, 'Build/Cesium/Cesium'));
    return;
}

try {
    module.exports = require('esm')(module)('./Source/Cesium.js');
} catch (e) {
    if (e.code !== 'ERR_REQUIRE_ESM') {
        throw e;
    }

    // Node 12+ throws an exception when trying to load an ES module via `esm`,
    // because `esm` loads Cesium ES modules via require instead of import, and
    // that is an illegal thing to do because Cesium's package.json declares
    // `"type": "module"`. Node doesn't know that `esm` is magically
    // transforming the ES modules to CommonJS.
    //
    // So, we override the loader for .js files to skip the exception.
    // Idea from here:
    // https://github.com/standard-things/esm/issues/855#issuecomment-566825957
    var fs = require('fs');

    var originalFunc = require.extensions['.js'];
    require.extensions['.js'] = function(module, filename) {
        if (filename.startsWith(__dirname)) {
            var content = fs.readFileSync(filename, 'utf8');
            module._compile(content, filename);
            return;
        }
        originalFunc(module, filename);
    };
   
    module.exports = require('esm')(module)('./Source/Cesium.js');
}
