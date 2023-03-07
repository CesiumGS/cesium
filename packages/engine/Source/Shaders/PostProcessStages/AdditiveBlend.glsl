uniform sampler2D colorTexture;
uniform sampler2D colorTexture2;

uniform vec2 center;
uniform float radius;

in vec2 v_textureCoordinates;

void main()
{
    vec4 color0 = texture(colorTexture, v_textureCoordinates);
    vec4 color1 = texture(colorTexture2, v_textureCoordinates);

    float x = length(gl_FragCoord.xy - center) / radius;
    float t = smoothstep(0.5, 0.8, x);
    out_FragColor = mix(color0 + color1, color1, t);
}
