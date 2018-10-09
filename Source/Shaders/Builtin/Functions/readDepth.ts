//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_readDepth(sampler2D depthTexture, vec2 texCoords)\n\
{\n\
    return czm_reverseLogDepth(texture2D(depthTexture, texCoords).r);\n\
}\n\
";
});