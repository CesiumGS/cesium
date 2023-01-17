uniform sampler2D colorTexture;
uniform sampler2D ambientOcclusionTexture;
uniform bool ambientOcclusionOnly;
in vec2 v_textureCoordinates;

void main(void)
{
    vec3 color = texture(colorTexture, v_textureCoordinates).rgb;
    vec3 ao = texture(ambientOcclusionTexture, v_textureCoordinates).rgb;
    out_FragColor.rgb = ambientOcclusionOnly ? ao : ao * color;
}
