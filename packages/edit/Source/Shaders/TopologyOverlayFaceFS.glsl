in vec4 v_pickColor;
in vec3 v_positionEC;
flat in float v_selected;

uniform vec4 u_faceColor;
uniform vec4 u_faceSelectedColor;
uniform bool u_isPickPass;

void main()
{
    vec4 color = v_selected > 0.5 ? u_faceSelectedColor : u_faceColor;

    // The topology overlay faces are often drawn with 0 alpha unless selected. During the pick pass we must keep them so unselected faces
    // remain pickable (the pick pass wrapper discards on low alpha, so force alpha to 1 there).
    if (!u_isPickPass && color.a < 0.005) {
        discard;
    }
    color.a = u_isPickPass ? 1.0 : color.a;

    // Basic flat-shaded directional cue so the highlight isn't completely flat: brightest when
    // looking straight at the face, darker at grazing angles. abs() gives back-faces the same
    // treatment (half-Lambert-ish) so they don't go black. Skipped during the pick pass.
    vec3 normalEC = normalize(cross(dFdx(v_positionEC), dFdy(v_positionEC)));
    vec3 viewEC = normalize(-v_positionEC);
    float ndotv = abs(dot(normalEC, viewEC));
    float shade = mix(0.6, 1.05, ndotv);
    color.rgb *= u_isPickPass ? 1.0 : shade;

    out_FragColor = czm_gammaCorrect(color);
    czm_writeLogDepth();
}
