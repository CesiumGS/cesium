#define epsilon8 1e-8
#define enableAO
#extension GL_EXT_frag_depth : enable

uniform sampler2D u_pointCloud_colorTexture;
uniform sampler2D u_pointCloud_ecTexture;
uniform sampler2D u_pointCloud_aoTexture;
uniform float u_sigmoidDomainOffset;
uniform float u_sigmoidSharpness;
varying vec2 v_textureCoordinates;

float sigmoid(float x, float sharpness)
{
    return sharpness * x / (sharpness - x + 1.0);
}

void main()
{
    vec4 color = texture2D(u_pointCloud_colorTexture, v_textureCoordinates);
#ifdef enableAO
    float ao = czm_unpackDepth(texture2D(u_pointCloud_aoTexture, v_textureCoordinates));
    ao = clamp(sigmoid(clamp(ao + u_sigmoidDomainOffset, 0.0, 1.0), u_sigmoidSharpness), 0.0, 1.0);
    color.xyz = color.xyz * ao;
#endif // enableAO
    vec4 ec = texture2D(u_pointCloud_ecTexture, v_textureCoordinates);
    if (length(ec) < epsilon8)
    {
        discard;
    }
    else
    {
        float depth = czm_eyeToWindowCoordinates(vec4(ec.xyz, 1.0)).z;
        gl_FragColor = color;
        gl_FragDepthEXT = depth;
    }
}
