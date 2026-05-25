in float a_localVertexId; // unused; here only to satisfy attribute index 0

uniform highp sampler2D u_positionTexture;
uniform vec2 u_positionTextureSize;
uniform highp usampler2D u_pointIndexTexture;
uniform vec2 u_pointIndexTextureSize;
uniform highp sampler2D u_pickColorTexture;
uniform highp sampler2D u_selectionTexture;
uniform float u_pointSize;
uniform float u_depthBias;

out vec4 v_pickColor;
flat out float v_selected;

ivec2 unpack1D(int idx, int width)
{
    return ivec2(idx % width, idx / width);
}

void main()
{
    // gl_InstanceID indexes u_pointIndexTexture, u_pickColorTexture, and
    // u_selectionTexture (all sized to the number of vertices this overlay
    // owns). u_pointIndexTexture then yields the bufferIndex into the shared
    // u_positionTexture.
    int instanceId = gl_InstanceID;
    ivec2 indexUV = unpack1D(instanceId, int(u_pointIndexTextureSize.x));
    int bufferIndex = int(texelFetch(u_pointIndexTexture, indexUV, 0).r);

    ivec2 positionUV = unpack1D(bufferIndex, int(u_positionTextureSize.x));
    vec3 positionMC = texelFetch(u_positionTexture, positionUV, 0).xyz;

    vec4 positionEC = czm_modelView * vec4(positionMC, 1.0);
    positionEC.z += abs(positionEC.z) * u_depthBias;

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth(gl_Position);

    gl_PointSize = u_pointSize * czm_pixelRatio + a_localVertexId; // Reference a_localVertexId to ensure it's not optimized out.

    v_pickColor = texelFetch(u_pickColorTexture, indexUV, 0);
    v_selected = texelFetch(u_selectionTexture, indexUV, 0).r;
}
