uniform sampler2D u_colorTexture;
uniform sampler2D u_bloomTexture;
uniform bool  u_glowOnly;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 bloom = texture2D(u_bloomTexture, v_textureCoordinates);
    vec4 color = texture2D(u_colorTexture, v_textureCoordinates);
    gl_FragColor = u_glowOnly ? bloom : bloom + color;
}
