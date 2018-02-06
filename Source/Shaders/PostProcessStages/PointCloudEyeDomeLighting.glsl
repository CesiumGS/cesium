#extension GL_EXT_frag_depth : enable

uniform sampler2D u_pointCloud_colorTexture;
uniform sampler2D u_pointCloud_ecAndLogDepthTexture;
uniform vec3 u_distancesAndEdlStrength;
varying vec2 v_textureCoordinates;

vec2 neighborContribution(float log2Depth, vec2 padding)
{
    vec2 depthAndLog2Depth = texture2D(u_pointCloud_ecAndLogDepthTexture, v_textureCoordinates + padding).zw;
    if (depthAndLog2Depth.x == 0.0) // 0.0 is the clear value for the gbuffer
    {
        return vec2(0.0); // throw out this sample
    }
    else
    {
        return vec2(max(0.0, log2Depth - depthAndLog2Depth.y), 1.0);
    }
}

void main()
{
    vec4 ecAlphaDepth = texture2D(u_pointCloud_ecAndLogDepthTexture, v_textureCoordinates);
    if (length(ecAlphaDepth.xyz) < czm_epsilon7)
    {
        discard;
    }
    else
    {
        vec4 color = texture2D(u_pointCloud_colorTexture, v_textureCoordinates);

        // sample from neighbors up, down, left, right
        float distX = u_distancesAndEdlStrength.x;
        float distY = u_distancesAndEdlStrength.y;

        vec2 responseAndCount = vec2(0.0);

        responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(0, distY));
        responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(distX, 0));
        responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(0, -distY));
        responseAndCount += neighborContribution(ecAlphaDepth.a, vec2(-distX, 0));

        float response = responseAndCount.x / responseAndCount.y;
        float shade = exp(-response * 300.0 * u_distancesAndEdlStrength.z);
        color.rgb *= shade;
        gl_FragColor = vec4(color);
        gl_FragDepthEXT = czm_eyeToWindowCoordinates(vec4(ecAlphaDepth.xyz, 1.0)).z;
    }
}
