uniform sampler2D colorTexture;
uniform float alpha;
uniform sampler2D texture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 screen = texture2D(colorTexture, v_textureCoordinates);
    vec4 color = texture2D(texture, v_textureCoordinates);
    gl_FragColor = vec4(mix(screen.rgb, color.rgb, alpha * color.a), 1.0);
}
