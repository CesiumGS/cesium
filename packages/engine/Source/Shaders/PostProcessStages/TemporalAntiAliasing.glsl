in vec2 v_textureCoordinates;

uniform sampler2D colorTexture;
uniform sampler2D historyTexture;

uniform float u_feedback;
uniform float u_reset;

void main()
{
    vec4 currentColor = texture(colorTexture, v_textureCoordinates);
    if (u_reset > 0.5) {
        out_FragColor = currentColor;
        return;
    }
    vec4 historyColor = texture(historyTexture, v_textureCoordinates);
    float feedback = clamp(u_feedback, 0.0, 1.0);
    out_FragColor = mix(currentColor, historyColor, feedback);
}
