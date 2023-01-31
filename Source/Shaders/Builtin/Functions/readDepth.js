//This file is automatically rebuilt by the Cesium build process.
export default "float czm_readDepth(sampler2D depthTexture, vec2 texCoords)\n\
{\n\
    return czm_reverseLogDepth(texture2D(depthTexture, texCoords).r);\n\
}\n\
";
