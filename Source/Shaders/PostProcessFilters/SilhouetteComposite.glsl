uniform sampler2D u_colorTexture;
uniform sampler2D u_silhouetteTexture;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec4 silhouetteColor = texture2D(u_silhouetteTexture, v_textureCoordinates);
    gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), silhouetteColor, silhouetteColor.a);
}
