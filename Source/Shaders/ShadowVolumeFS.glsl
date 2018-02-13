#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#else
varying vec4 v_color;
#endif

/*
vec3 drawingBufferToWgs84Coordinates(vec2 drawingBufferPosition, float depth) {
    vec4 ndc;
    ndc.x = (drawingBufferPosition.x - czm_viewport.x) / czm_viewport.z * 2.0 - 1.0;
    ndc.y = (drawingBufferPosition.y - czm_viewport.y) / czm_viewport.w * 2.0 - 1.0;
    ndc.z = (depth * 2.0) - 1.0;
    ndc.w = 1.0;

    if (czm_inverseViewProjection != mat4(0.0)) {
        vec4 worldCoords = czm_inverseViewProjection * ndc;
        // Reverse perspective divide?
        float w = 1.0 / worldCoords.w;
        worldCoords.xyz * w;
        return worldCoords.xyz;
    } else {
        // TODO: debug me toooo...
        float top = czm_frustumPlanes.x;
        float bottom = czm_frustumPlanes.y;
        float left = czm_frustumPlanes.z;
        float right = czm_frustumPlanes.w;

        float near = czm_currentFrustum.x;
        float far = czm_currentFrustum.y;

        vec4 worldCoords;
        worldCoords.x = (ndc.x * (right - left) + left + right) * 0.5;
        worldCoords.y = (ndc.y * (top - bottom) + bottom + top) * 0.5;
        worldCoords.z = (ndc.z * (near - far) - near - far) * 0.5;
        worldCoords.w = 1.0;

        worldCoords = czm_inverseView * worldCoords;
        return worldCoords.xyz;
    }
}*/

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = u_highlightColor;
#else
    vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
    float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));

    if (gl_FragCoord.x / czm_viewport.z > 0.5) {

        vec4 windowCoord = vec4(gl_FragCoord.xy, depth, 1.0);
        vec4 eyeCoord = czm_windowToEyeCoordinates(windowCoord);
        vec4 worldCoord = czm_inverseView * eyeCoord;

        float height = length(worldCoord.xyz / worldCoord.w);

// 6370000
        gl_FragColor = vec4(vec3((height - 6370000.0) / 10000.0), 1.0);
    } else {

        gl_FragColor = vec4(vec3(depth), 1.0);
    }
#endif
    czm_writeDepthClampedToFarPlane();
}
