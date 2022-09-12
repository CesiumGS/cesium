uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 color = texture2D(u_texture, v_textureCoordinates);
    gl_FragColor = czm_gammaCorrect(color);
}
