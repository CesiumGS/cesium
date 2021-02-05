uniform highp sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

void main()
{
    gl_FragColor = czm_packDepth(texture2D(u_depthTexture, v_textureCoordinates).r);
}
