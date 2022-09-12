uniform sampler2D colorTexture;
uniform sampler2D silhouetteTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 silhouetteColor = texture2D(silhouetteTexture, v_textureCoordinates);
    vec4 color = texture2D(colorTexture, v_textureCoordinates);
    gl_FragColor = mix(color, silhouetteColor, silhouetteColor.a);
}
