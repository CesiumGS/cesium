//This file is automatically rebuilt by the Cesium build process.
export default "void modelSplitterStage()\n\
{\n\
    // Don't split when rendering the shadow map, because it is rendered from\n\
    // the perspective of a totally different camera.\n\
#ifndef SHADOW_MAP\n\
    if (model_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard;\n\
    if (model_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard;\n\
#endif\n\
}\n\
";
