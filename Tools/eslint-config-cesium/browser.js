/*eslint-env node*/
'use strict';

module.exports = {
    "extends": "eslint-config-cesium",
    "globals": {
        "JSON": true,
        "require": true,
        "console": true,
        "Sandcastle": true,
        "Cesium": true
    },
    "plugins": [
        "html"
    ]
};
