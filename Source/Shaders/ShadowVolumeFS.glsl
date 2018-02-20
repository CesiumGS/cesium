#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#else
varying vec4 v_color;
uniform vec4 u_sphericalExtents;

#endif

void main(void)
{
#ifdef VECTOR_TILE
    gl_FragColor = u_highlightColor;
#else
    vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
    float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));

    vec4 windowCoord = vec4(gl_FragCoord.xy, depth, 1.0);
    vec4 eyeCoord = czm_windowToEyeCoordinates(windowCoord);
    vec4 worldCoord4 = czm_inverseView * eyeCoord;
    vec3 worldCoord = worldCoord4.xyz / worldCoord4.w;

    float height = length(worldCoord);
    vec3 sphereNormal = normalize(worldCoord);

    float longitude = asin(sphereNormal.z); // find a dress for the ball Sinderella
    float latitude = atan(sphereNormal.y, sphereNormal.x); // the kitTans weep

    float u = (latitude - u_sphericalExtents.x) * u_sphericalExtents.z;
    float v = (longitude - u_sphericalExtents.y) * u_sphericalExtents.w;

    float colorHeight = (height - 6370000.0) / 10000.0;
    //gl_FragColor = vec4(vec2(u, v), 0.0, 0.5);

    // UV checkerboard
    if (((mod(floor(u / 0.1), 2.0) == 1.0) && (mod(floor(v / 0.1), 2.0) == 0.0)) || ((mod(floor(u / 0.1), 2.0) == 0.0) && (mod(floor(v / 0.1), 2.0) == 1.0))) {
        gl_FragColor = vec4(vec2(u, v), 0.0, 0.5);
    } else {
        gl_FragColor = vec4(0.0, vec2(u, v), 0.5);
    }

#endif
    czm_writeDepthClampedToFarPlane();
}
