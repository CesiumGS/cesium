varying vec2 v_textureCoordinates;

uniform sampler2D u_texture;
uniform vec2 u_fxaaQualityRcpFrame;

const float fxaaQualitySubpix = 0.5;
const float fxaaQualityEdgeThreshold = 0.125;
const float fxaaQualityEdgeThresholdMin = 0.0833;

void main()
{
    vec4 color = FxaaPixelShader(
        v_textureCoordinates,
        u_texture,
        u_fxaaQualityRcpFrame,
        fxaaQualitySubpix,
        fxaaQualityEdgeThreshold,
        fxaaQualityEdgeThresholdMin);
    float alpha = texture2D(u_texture, v_textureCoordinates).a;
    gl_FragColor = vec4(color.rgb, alpha);
}
