uniform sampler2D colorTexture;
uniform sampler2D silhouetteTexture;

in vec2 v_textureCoordinates;

void main(void)
{
    vec4 silhouetteColor = texture(silhouetteTexture, v_textureCoordinates);
    vec4 color = texture(colorTexture, v_textureCoordinates);
    out_FragColor = mix(color, silhouetteColor, silhouetteColor.a);
}
