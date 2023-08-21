uniform sampler2D colorTexture;
uniform sampler2D ambientOcclusionTexture;
uniform bool ambientOcclusionOnly;
in vec2 v_textureCoordinates;

void main(void)
{
    vec4 color = texture(colorTexture, v_textureCoordinates);
    vec4 ao = texture(ambientOcclusionTexture, v_textureCoordinates);
    out_FragColor = ambientOcclusionOnly ? ao : ao * color;
}
