uniform highp sampler2D u_depthTexture;

in vec2 v_textureCoordinates;

void main()
{
    out_FragColor = czm_packDepth(texture(u_depthTexture, v_textureCoordinates).r);
}
