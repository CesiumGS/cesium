//This file is automatically rebuilt by the Cesium build process.
export default "varying vec2 v_textureCoordinates;\n\
\n\
uniform sampler2D colorTexture;\n\
\n\
const float fxaaQualitySubpix = 0.5;\n\
const float fxaaQualityEdgeThreshold = 0.125;\n\
const float fxaaQualityEdgeThresholdMin = 0.0833;\n\
\n\
void main()\n\
{\n\
    vec2 fxaaQualityRcpFrame = vec2(1.0) / czm_viewport.zw;\n\
    vec4 color = FxaaPixelShader(\n\
        v_textureCoordinates,\n\
        colorTexture,\n\
        fxaaQualityRcpFrame,\n\
        fxaaQualitySubpix,\n\
        fxaaQualityEdgeThreshold,\n\
        fxaaQualityEdgeThresholdMin);\n\
    float alpha = texture2D(colorTexture, v_textureCoordinates).a;\n\
    gl_FragColor = vec4(color.rgb, alpha);\n\
}\n\
";
