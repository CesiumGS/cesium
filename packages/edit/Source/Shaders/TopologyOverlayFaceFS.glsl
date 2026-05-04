in vec4 v_pickColor;
flat in float v_selected;

uniform vec4 u_faceColor;
uniform vec4 u_faceSelectedColor;
uniform bool u_isPickPass;

void main()
{
    vec4 color = v_selected > 0.5 ? u_faceSelectedColor : u_faceColor;
    // We don't want to discard during the pick pass (which wraps this shader and discard pixels with low alphas).
    // The topology overlay faces are often drawn with 0 alpha, unless they're selected. If we discard based on alpha,
    // then we won't be able to select unselected faces.
    if (u_isPickPass)
    {
        color.a = 1.0;
    }
    else if (color.a < 0.005)
    {
        discard;
    }
    out_FragColor = czm_gammaCorrect(color);
    czm_writeLogDepth();
}
