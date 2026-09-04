in vec4 v_pickColor;
in vec4 v_color;

void main()
{
#if !defined(OPAQUE) && !defined(TRANSLUCENT)
    if (v_color.a < 0.005)   // matches 0/255 and 1/255
    {
        discard;
    }
#else
// The collection is drawn twice. The opaque pass discards translucent fragments
// and the translucent pass discards opaque fragments.
#ifdef OPAQUE
    if (v_color.a < 0.995)   // matches < 254/255
    {
        discard;
    }
#else
    if (v_color.a >= 0.995)  // matches 254/255 and 255/255
    {
        discard;
    }
#endif
#endif

    out_FragColor = czm_gammaCorrect(v_color);
    czm_writeLogDepth();
}
