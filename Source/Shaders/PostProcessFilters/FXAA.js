//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "varying vec2 v_textureCoordinates;\n\
\n\
uniform sampler2D u_texture;\n\
uniform vec2 u_fxaaQualityRcpFrame;\n\
\n\
const float fxaaQualitySubpix = 0.5;\n\
const float fxaaQualityEdgeThreshold = 0.125;\n\
const float fxaaQualityEdgeThresholdMin = 0.0833;\n\
\n\
void main()\n\
{\n\
    vec4 color = FxaaPixelShader(\n\
        v_textureCoordinates,\n\
        u_texture,\n\
        u_fxaaQualityRcpFrame,\n\
        fxaaQualitySubpix,\n\
        fxaaQualityEdgeThreshold,\n\
        fxaaQualityEdgeThresholdMin);\n\
    float alpha = texture2D(u_texture, v_textureCoordinates).a;\n\
    gl_FragColor = vec4(color.rgb, alpha);\n\
}\n\
";
});