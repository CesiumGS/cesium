uniform sampler2D u_opaqueDepthTexture;
uniform sampler2D u_translucentDepthTexture;

in vec2 v_textureCoordinates;

void main()
{
    float opaqueDepth = texture(u_opaqueDepthTexture, v_textureCoordinates).r;
    float translucentDepth = texture(u_translucentDepthTexture, v_textureCoordinates).r;
    translucentDepth = czm_branchFreeTernary(translucentDepth > opaqueDepth, 1.0, translucentDepth);
    out_FragColor = czm_packDepth(translucentDepth);
}
