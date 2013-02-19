uniform sampler2D u_texture;

uniform vec4 u_textureTranslationAndScale;
uniform vec4 u_textureCoordinateExtent;

varying vec2 v_textureCoordinates;

void main()
{
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec2 geographicUV = clamp(v_textureCoordinates, 0.0, 1.0);

    if (geographicUV.s < u_textureCoordinateExtent.s ||
        geographicUV.s > u_textureCoordinateExtent.p ||
        geographicUV.t < u_textureCoordinateExtent.t ||
        geographicUV.t > u_textureCoordinateExtent.q)
    {
        discard;
    }

    gl_FragColor = texture2D(u_texture, geographicUV);
}
