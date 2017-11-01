uniform sampler2D colorTexture;
uniform sampler2D ambientOcclusionTexture;
uniform bool ambientOcclusionOnly;
varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;
    vec3 ao = texture2D(ambientOcclusionTexture, v_textureCoordinates).rgb;
    gl_FragColor.rgb = ambientOcclusionOnly ? ao : ao * color;
}
