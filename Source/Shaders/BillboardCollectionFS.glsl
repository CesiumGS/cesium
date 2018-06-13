uniform sampler2D u_atlas;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_textureCoordinates;

varying vec4 v_pickColor;
varying vec4 v_color;

void main()
{
    vec4 color = texture2D(u_atlas, v_textureCoordinates) * v_color;

// Fully transparent parts of the billboard are not pickable.
#if !defined(OPAQUE) && !defined(TRANSLUCENT)
    if (color.a < 0.005)   // matches 0/255 and 1/255
    {
        discard;
    }
#else
// The billboard is rendered twice. The opaque pass discards translucent fragments
// and the translucent pass discards opaque fragments.
#ifdef OPAQUE
    if (color.a < 0.995)   // matches < 254/255
    {
        discard;
    }
#else
    if (color.a >= 0.995)  // matches 254/255 and 255/255
    {
        discard;
    }
#endif
#endif

#ifdef VECTOR_TILE
    color *= u_highlightColor;
#endif

    gl_FragColor = color;
    czm_writeLogDepth();
}
