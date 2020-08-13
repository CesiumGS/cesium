varying vec2 v_textureCoordinates;

uniform sampler2D colorTexture;

const float fxaaQualitySubpix = 0.5;
const float fxaaQualityEdgeThreshold = 0.125;
const float fxaaQualityEdgeThresholdMin = 0.0833;

const float fxaaChannelDiffThreshold = 0.12;

void main()
{
    // Terrible hack:
    // Don't run FXAA on grey fragments.
    // Since most text is black or white, this tends to preserve it while allowing us to AA everything else
    vec4 initialColor = texture2D(colorTexture, v_textureCoordinates);
    if (abs(initialColor.r - initialColor.b) + abs(initialColor.r - initialColor.g) + abs(initialColor.g - initialColor.b) < fxaaChannelDiffThreshold) {
        gl_FragColor = initialColor;
        return;
    }

    vec2 fxaaQualityRcpFrame = vec2(1.0) / czm_viewport.zw;

    vec4 color = FxaaPixelShader(
        v_textureCoordinates,
        colorTexture,
        fxaaQualityRcpFrame,
        fxaaQualitySubpix,
        fxaaQualityEdgeThreshold,
        fxaaQualityEdgeThresholdMin);
    float alpha = texture2D(colorTexture, v_textureCoordinates).a;
    gl_FragColor = vec4(color.rgb, alpha);
}
