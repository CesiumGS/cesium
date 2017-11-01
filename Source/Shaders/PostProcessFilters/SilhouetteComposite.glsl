uniform sampler2D colorTexture;
uniform sampler2D originalColorTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 silhouetteColor = texture2D(colorTexture, v_textureCoordinates);
    gl_FragColor = mix(texture2D(originalColorTexture, v_textureCoordinates), silhouetteColor, silhouetteColor.a);
}
