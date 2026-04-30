in float a_localVertexId; // unused; here only to satisfy attribute index 0

uniform highp sampler2D u_positionTexture;
uniform highp sampler2D u_pickColorTexture;
uniform vec2 u_textureSize;
uniform float u_pointSize;
uniform float u_depthBias;

out vec4 v_pickColor;

void main()
{
    // gl_InstanceID is one Vertex slot in the underlying POSITION buffer.
    // Both u_positionTexture and u_pickColorTexture are sized to vertexCount,
    // so the same (col, row) coordinate indexes both.
    int idx = gl_InstanceID;
    int width = int(u_textureSize.x);
    ivec2 uv = ivec2(idx % width, idx / width);

    vec3 positionMC = texelFetch(u_positionTexture, uv, 0).xyz;
    vec4 positionEC = czm_modelView * vec4(positionMC, 1.0);
    positionEC.z += u_depthBias;

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth(gl_Position);

    gl_PointSize = u_pointSize * czm_pixelRatio;

    v_pickColor = texelFetch(u_pickColorTexture, uv, 0);
}
