varying vec2 v_textureCoordinates;

uniform sampler2D u_texture;
uniform vec2 u_fxaaQualityRcpFrame;
uniform float u_fxaaQualitySubpix;
uniform float u_fxaaQualityEdgeThreshold;
uniform float u_fxaaQualityEdgeThresholdMin;

// unused constants, only used on consoles
vec4 fxaaConsolePosPos = vec4(0.0);
vec4 fxaaConsoleRcpFrameOpt = vec4(0.0);
vec4 fxaaConsoleRcpFrameOpt2 = vec4(0.0);
vec4 fxaaConsole360RcpFrameOpt2 = vec4(0.0);
float fxaaConsoleEdgeSharpness = 0.0;
float fxaaConsoleEdgeThreshold = 0.0;
float fxaaConsoleEdgeThresholdMin = 0.0;
vec4 fxaaConsole360ConstDir = vec4(0.0);

void main()
{
    gl_FragColor = FxaaPixelShader(
        v_textureCoordinates,
        fxaaConsolePosPos,
        u_texture,
        u_texture,
        u_texture,
        u_fxaaQualityRcpFrame,
        fxaaConsoleRcpFrameOpt,
        fxaaConsoleRcpFrameOpt2,
        fxaaConsole360RcpFrameOpt2,
        u_fxaaQualitySubpix,
        u_fxaaQualityEdgeThreshold,
        u_fxaaQualityEdgeThresholdMin,
        fxaaConsoleEdgeSharpness,
        fxaaConsoleEdgeThreshold,
        fxaaConsoleEdgeThresholdMin,
        fxaaConsole360ConstDir);
}
