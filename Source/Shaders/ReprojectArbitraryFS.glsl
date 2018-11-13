uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 color = texture2D(u_texture, v_textureCoordinates);
    bool inBounds = UMIN < v_textureCoordinates.x && v_textureCoordinates.x < UMAX && VMIN < v_textureCoordinates.y && v_textureCoordinates.y < VMAX;
    color.a = czm_branchFreeTernary(inBounds, color.a, 0.0);

    gl_FragColor = color;
}
