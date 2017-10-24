uniform sampler2D u_colorTexture;
uniform sampler2D u_toonTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 toonColor = texture2D(u_toonTexture, v_textureCoordinates);
    gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), toonColor, toonColor.a);
}
