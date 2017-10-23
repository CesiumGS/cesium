uniform sampler2D u_colorTexture;
uniform float u_kernelSize;
varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 result = vec4(0.0);
    vec2 recipalScreenSize = u_kernelSize / czm_viewport.zw;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * 4.0, 0.0)) * 0.00390625;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * 3.0, 0.0)) * 0.03125;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * 2.0, 0.0)) * 0.109375;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x, 0.0)) * 0.21875;
    result += texture2D(u_colorTexture, v_textureCoordinates) * 0.2734375;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x, 0.0)) * 0.21875;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*2.0, 0.0)) * 0.109375;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*3.0, 0.0)) * 0.03125;
    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*4.0, 0.0)) * 0.00390625;
    gl_FragColor = result;
}
