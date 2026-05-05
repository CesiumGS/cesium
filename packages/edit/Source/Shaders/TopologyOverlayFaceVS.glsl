in float a_localVertexId;

uniform highp sampler2D u_positionTexture;
uniform vec2 u_positionTextureSize;
uniform highp usampler2D u_triangleIndexTexture;
uniform vec2 u_triangleIndexTextureSize;
uniform highp sampler2D u_pickColorTexture;
uniform vec2 u_pickColorTextureSize;
uniform highp sampler2D u_selectionTexture;
uniform float u_depthBias;

out vec4 v_pickColor;
out vec3 v_positionEC;
flat out float v_selected;

ivec2 unpack1D(int idx, int width)
{
    return ivec2(idx % width, idx / width);
}

void main()
{
    int instanceId = gl_InstanceID;
    ivec2 triUV = unpack1D(instanceId, int(u_triangleIndexTextureSize.x));
    uvec4 triangle = texelFetch(u_triangleIndexTexture, triUV, 0);

    int corner = int(a_localVertexId);
    uint vertexIdx = corner == 0 ? triangle.r : (corner == 1 ? triangle.g : triangle.b);
    uint faceIdx = triangle.a;

    int positionTextureWidth = int(u_positionTextureSize.x);
    ivec2 posUV = unpack1D(int(vertexIdx), positionTextureWidth);
    vec3 positionMC = texelFetch(u_positionTexture, posUV, 0).xyz;

    vec4 positionEC = czm_modelView * vec4(positionMC, 1.0);
    positionEC.z += abs(positionEC.z) * u_depthBias;
    v_positionEC = positionEC.xyz;

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth(gl_Position);

    int pickWidth = int(u_pickColorTextureSize.x);
    ivec2 pickUV = unpack1D(int(faceIdx), pickWidth);
    v_pickColor = texelFetch(u_pickColorTexture, pickUV, 0);
    v_selected = texelFetch(u_selectionTexture, pickUV, 0).r;
}
