in float a_localVertexId;

uniform highp sampler2D u_positionTexture;
uniform vec2 u_positionTextureSize;
uniform highp usampler2D u_edgeEndpointTexture;
uniform vec2 u_edgeEndpointTextureSize;
uniform highp sampler2D u_pickColorTexture;
uniform float u_edgeWidth;

out vec4 v_pickColor;
// Signed perpendicular offset across the quad: -1 at one long edge, +1 at the
// other. Used for fwidth-based AA in the fragment shader.
out float v_perp;

ivec2 unpack1D(int idx, int width)
{
    return ivec2(idx % width, idx / width);
}

void main()
{
    int instanceId = gl_InstanceID;
    ivec2 endpointUV = unpack1D(instanceId, int(u_edgeEndpointTextureSize.x));
    uvec2 endpoints = texelFetch(u_edgeEndpointTexture, endpointUV, 0).rg;

    int positionTextureWidth = int(u_positionTextureSize.x);
    ivec2 uvA = unpack1D(int(endpoints.x), positionTextureWidth);
    ivec2 uvB = unpack1D(int(endpoints.y), positionTextureWidth);

    vec3 positionAMC = texelFetch(u_positionTexture, uvA, 0).xyz;
    vec3 positionBMC = texelFetch(u_positionTexture, uvB, 0).xyz;

    vec4 positionAEC = czm_modelView * vec4(positionAMC, 1.0);
    vec4 positionBEC = czm_modelView * vec4(positionBMC, 1.0);

    // a_localVertexId = 0 -> (A, -1)   1 -> (A, +1)   2 -> (B, -1)   3 -> (B, +1)
    bool atB = a_localVertexId >= 2.0;
    float expandDirection = mod(a_localVertexId, 2.0) < 0.5 ? -1.0 : 1.0;

    // Edges have no neighbors in the overlay - mirror the opposite endpoint
    // through the current one so getPolylineWindowCoordinatesEC produces a
    // perpendicular extrusion instead of a mitered one.
    vec4 positionEC = atB ? positionBEC : positionAEC;
    vec4 prevEC = atB ? positionAEC : (2.0 * positionAEC - positionBEC);
    vec4 nextEC = atB ? (2.0 * positionBEC - positionAEC) : positionBEC;
    bool usePrevious = atB;

    float angle;
    vec4 positionWC = getPolylineWindowCoordinatesEC(
        positionEC, prevEC, nextEC,
        expandDirection, u_edgeWidth, usePrevious, angle);
    gl_Position = czm_viewportOrthographic * positionWC;
    czm_vertexLogDepth();

    v_perp = expandDirection;
    v_pickColor = texelFetch(u_pickColorTexture, endpointUV, 0);
}
