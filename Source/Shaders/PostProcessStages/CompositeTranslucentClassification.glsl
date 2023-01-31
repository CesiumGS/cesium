uniform sampler2D colorTexture;

#ifdef DEBUG_SHOW_DEPTH
uniform sampler2D u_packedTranslucentDepth;
#endif

varying vec2 v_textureCoordinates;

void main()
{
#ifdef DEBUG_SHOW_DEPTH
    if (v_textureCoordinates.x < 0.5)
    {
        gl_FragColor.rgb = vec3(czm_unpackDepth(texture2D(u_packedTranslucentDepth, v_textureCoordinates)));
        gl_FragColor.a = 1.0;
    }
#else
    vec4 color = texture2D(colorTexture, v_textureCoordinates);

#ifdef PICK
    if (color == vec4(0.0))
    {
        discard;
    }
#else
    // Reverse premultiplication process to get the correct composited result of the classification primitives
    color.rgb /= color.a;
#endif
    gl_FragColor = color;
#endif
}
