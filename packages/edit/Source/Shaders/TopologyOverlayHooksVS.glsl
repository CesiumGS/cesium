// Cesium's implementation of the topology overlay's vertex shader hooks.

uniform highp sampler2D u_pickColorTexture;
flat out vec4 v_pickColor;

vec4 topologyOverlay_modelToEye(vec3 positionMC)
{
    return czm_modelView * vec4(positionMC, 1.0);
}

vec4 topologyOverlay_eyeToClip(vec4 positionEC)
{
    return czm_projection * positionEC;
}

vec2 topologyOverlay_viewportSize()
{
    return czm_viewport.zw;
}

void topologyOverlay_setVertexOutputs(vec4 positionEC, uint componentIndex)
{
    ivec2 coord = topologyOverlay_texelCoord(componentIndex, textureSize(u_pickColorTexture, 0));
    v_pickColor = texelFetch(u_pickColorTexture, coord, 0);
    czm_vertexLogDepth();
}
