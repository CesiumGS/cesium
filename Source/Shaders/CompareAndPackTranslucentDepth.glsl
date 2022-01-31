uniform sampler2D u_opaqueDepthTexture;
uniform sampler2D u_translucentDepthTexture;

varying vec2 v_textureCoordinates;

void main()
{
    float opaqueDepth = texture2D(u_opaqueDepthTexture, v_textureCoordinates).r;
    float translucentDepth = texture2D(u_translucentDepthTexture, v_textureCoordinates).r;
    translucentDepth = czm_branchFreeTernary(translucentDepth > opaqueDepth, 1.0, translucentDepth);
    gl_FragColor = czm_packDepth(translucentDepth);
}
