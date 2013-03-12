uniform sampler2D u_texture;

uniform vec4 u_textureTranslationAndScale;
uniform vec4 u_textureCoordinateExtent;

varying vec2 v_textureCoordinates;

void main()
{
    if (v_textureCoordinates.s < u_textureCoordinateExtent.s ||
        v_textureCoordinates.s > u_textureCoordinateExtent.p ||
        v_textureCoordinates.t < u_textureCoordinateExtent.t ||
        v_textureCoordinates.t > u_textureCoordinateExtent.q)
    {
        discard;
    }

    vec2 translation = u_textureTranslationAndScale.xy;
    vec2 scale = u_textureTranslationAndScale.zw;
    vec2 geographicUV = v_textureCoordinates * scale + translation;

    gl_FragColor = texture2D(u_texture, geographicUV);
}
