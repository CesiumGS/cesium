uniform sampler2D colorTexture;
uniform sampler2D originalColorTexture;
uniform bool ambientOcclusionOnly;
varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 color = texture2D(originalColorTexture, v_textureCoordinates).rgb;
    vec3 ao = texture2D(colorTexture, v_textureCoordinates).rgb;
    gl_FragColor.rgb = ambientOcclusionOnly ? ao : ao * color;
}
