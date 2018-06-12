uniform sampler2D u_atlas;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_textureCoordinates;
varying vec4 v_pickColor;
varying vec4 v_color;

#ifdef CLAMP_TO_GROUND
varying vec4 v_textureOffset;
varying vec2 v_originTextureCoordinate;
varying vec2 v_leftTextureCoordinate;
varying vec2 v_rightTextureCoordinate;
varying vec2 v_dimensions;
varying vec2 v_imageSize;
varying vec2 v_translate;
varying float v_eyeDepth;
varying float v_disableDepthTestDistance;

float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST)
{
    vec2 a = v_imageSize.xy * (depthLookupST - adjustedST);
    vec2 Dd = v_dimensions - v_imageSize;
    vec2 px = v_translate.xy + (v_dimensions * v_originTextureCoordinate * vec2(0, -1)); // this is only needed for labels

    vec2 st = ((a - px + (depthLookupST * Dd)) + gl_FragCoord.xy) / czm_viewport.zw;

    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st));

    if (logDepthOrDepth == 0.0)
    {
        return 0.0;
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    return eyeCoordinate.z / eyeCoordinate.w;
}
#endif

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

#ifdef CLAMP_TO_GROUND
    if (v_eyeDepth > -v_disableDepthTestDistance) {
        vec2 adjustedST = v_textureCoordinates - v_textureOffset.xy;
        adjustedST = adjustedST / vec2(v_textureOffset.z - v_textureOffset.x, v_textureOffset.w - v_textureOffset.y);

        float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinate);
        float globeDepth2 = getGlobeDepth(adjustedST, v_leftTextureCoordinate);
        float globeDepth3 = getGlobeDepth(adjustedST, v_rightTextureCoordinate);

        float epsilonEyeDepth = v_eyeDepth + czm_epsilon5;

        // negative values go into the screen
        if (globeDepth1 > epsilonEyeDepth && globeDepth2 > epsilonEyeDepth && globeDepth3 > epsilonEyeDepth)
        {
            discard;
        }
    }
#endif

}
