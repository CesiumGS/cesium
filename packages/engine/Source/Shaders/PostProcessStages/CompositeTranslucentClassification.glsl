uniform sampler2D colorTexture;
uniform sampler2D u_packedTranslucentDepth;

in vec2 v_textureCoordinates;

void main()
{
    float unpackDepth = czm_unpackDepth(texture2D(u_packedTranslucentDepth, v_textureCoordinates));
#ifdef DEBUG_SHOW_DEPTH
    if (v_textureCoordinates.x < 0.5)
    {
        out_FragColor.rgb = vec3(unpackDepth);
        out_FragColor.a = 1.0;
    }
#else
    if (unpackDepth == 0.0)
    {
        discard;
    }
    vec4 color = texture(colorTexture, v_textureCoordinates);

#ifdef PICK
    if (color == vec4(0.0))
    {
        discard;
    }
#else
    // Reverse premultiplication process to get the correct composited result of the classification primitives
    color.rgb /= color.a;
#endif
    out_FragColor = color;
#endif
}
