uniform sampler2D u_colorTexture;
uniform float u_alpha;
uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 screen = texture2D(u_colorTexture, v_textureCoordinates);
    vec4 color = texture2D(u_texture, v_textureCoordinates);
    gl_FragColor = vec4(mix(screen.rgb, color.rgb, u_alpha * color.a), 1.0);
}
