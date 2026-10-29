// Cesium's implementation of the topology overlay's fragment shader hooks.

flat in vec4 v_pickColor;

void topologyOverlay_writeColor(vec4 color)
{
    out_FragColor = color;
    czm_writeLogDepth();
}
