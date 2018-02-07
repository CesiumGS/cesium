uniform sampler2D depthTexture;
uniform float frustum;

varying vec2 v_textureCoordinates;

void main() {
    vec4 packedDepth = texture2D(depthTexture, v_textureCoordinates);
    if (czm_unpackDepth(packedDepth) < czm_epsilon7)
    {
        discard;
    }
    gl_FragColor = vec4(packedDepth.xyz, frustum);
}
