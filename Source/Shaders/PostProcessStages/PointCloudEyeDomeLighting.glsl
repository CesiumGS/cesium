#extension GL_EXT_frag_depth : enable

uniform sampler2D u_pointCloud_colorGBuffer;
uniform sampler2D u_pointCloud_depthGBuffer;
uniform vec3 u_distancesAndEdlStrength;
varying vec2 v_textureCoordinates;

vec2 neighborContribution(float log2Depth, vec2 padding)
{
    float depthOrLogDepth = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, v_textureCoordinates + padding));
    if (depthOrLogDepth == 0.0) { // 0.0 is the clear value for the gbuffer
        return vec2(0.0);
    }
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(v_textureCoordinates + padding, depthOrLogDepth);
    return vec2(max(0.0, log2Depth - log2(-eyeCoordinate.z / eyeCoordinate.w)), 1.0);
}

void main()
{
    float depthOrLogDepth = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, v_textureCoordinates));

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depthOrLogDepth);
    eyeCoordinate /= eyeCoordinate.w;

    float log2Depth = log2(-eyeCoordinate.z);

    if (depthOrLogDepth == 0.0) // 0.0 is the clear value for the gbuffer
    {
        discard;
    }

    vec4 color = texture2D(u_pointCloud_colorGBuffer, v_textureCoordinates);

    // sample from neighbors up, down, left, right
    float distX = u_distancesAndEdlStrength.x;
    float distY = u_distancesAndEdlStrength.y;

    vec2 responseAndCount = vec2(0.0);

    responseAndCount += neighborContribution(log2Depth, vec2(0, distY));
    responseAndCount += neighborContribution(log2Depth, vec2(distX, 0));
    responseAndCount += neighborContribution(log2Depth, vec2(0, -distY));
    responseAndCount += neighborContribution(log2Depth, vec2(-distX, 0));

    float response = responseAndCount.x / responseAndCount.y;
    float shade = exp(-response * 300.0 * u_distancesAndEdlStrength.z);
    color.rgb *= shade;
    gl_FragColor = vec4(color);

#ifdef LOG_DEPTH
    czm_writeLogDepth(1.0 + (czm_projection * vec4(eyeCoordinate.xyz, 1.0)).w);
#else
    gl_FragDepthEXT = czm_eyeToWindowCoordinates(vec4(eyeCoordinate.xyz, 1.0)).z;
#endif
}
