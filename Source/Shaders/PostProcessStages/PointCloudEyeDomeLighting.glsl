#extension GL_EXT_frag_depth : enable

uniform sampler2D u_pointCloud_colorGBuffer;
uniform sampler2D u_pointCloud_depthGBuffer;
uniform vec2 u_distanceAndEdlStrength;
varying vec2 v_textureCoordinates;

vec2 neighborContribution(float log2Depth, vec2 offset)
{
    float dist = u_distanceAndEdlStrength.x;
    vec2 texCoordOrig = v_textureCoordinates + offset * dist;
    vec2 texCoord0 = v_textureCoordinates + offset * floor(dist);
    vec2 texCoord1 = v_textureCoordinates + offset * ceil(dist);

    float depthOrLogDepth0 = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, texCoord0));
    float depthOrLogDepth1 = czm_unpackDepth(texture2D(u_pointCloud_depthGBuffer, texCoord1));

    // ignore depth values that are the clear depth
    if (depthOrLogDepth0 == 0.0 || depthOrLogDepth1 == 0.0) {
        return vec2(0.0);
    }

    // interpolate the two adjacent depth values
    float depthMix = mix(depthOrLogDepth0, depthOrLogDepth1, fract(dist));
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(texCoordOrig, depthMix);
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

    // sample from neighbors left, right, down, up
    vec2 texelSize = 1.0 / czm_viewport.zw;

    vec2 responseAndCount = vec2(0.0);

    responseAndCount += neighborContribution(log2Depth, vec2(-texelSize.x, 0.0));
    responseAndCount += neighborContribution(log2Depth, vec2(+texelSize.x, 0.0));
    responseAndCount += neighborContribution(log2Depth, vec2(0.0, -texelSize.y));
    responseAndCount += neighborContribution(log2Depth, vec2(0.0, +texelSize.y));

    float response = responseAndCount.x / responseAndCount.y;
    float strength = u_distanceAndEdlStrength.y;
    float shade = exp(-response * 300.0 * strength);
    color.rgb *= shade;
    gl_FragColor = vec4(color);

#ifdef LOG_DEPTH
    czm_writeLogDepth(1.0 + (czm_projection * vec4(eyeCoordinate.xyz, 1.0)).w);
#else
    gl_FragDepthEXT = czm_eyeToWindowCoordinates(vec4(eyeCoordinate.xyz, 1.0)).z;
#endif
}
