uniform sampler2D u_atlas;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_textureCoordinates;
varying vec4 v_pickColor;
varying vec4 v_color;

#ifdef CLAMP_TO_GROUND
varying vec4 v_textureCoordinateBounds;                  // the min and max x and y values for the texture coordinates
varying vec4 v_originTextureCoordinateAndTranslate;      // texture coordinate at the origin, billboard translate (used for label glyphs)
varying vec4 v_leftAndRightTextureCoordinate;            // texture coordinates for left and right depth test
varying vec4 v_dimensionsAndImageSize;                   // dimensions of the bounding rectangle and the size of the image.  The values will only be different for label glyphs
varying vec2 v_eyeDepthAndDistance;                      // The depth of the billboard and the disable depth test distance

float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST)
{
    vec2 dimensions = v_dimensionsAndImageSize.xy;
    vec2 imageSize = v_dimensionsAndImageSize.zw;

    vec2 lookupVector = imageSize * (depthLookupST - adjustedST);
    vec2 labelOffset = depthLookupST * (dimensions - imageSize); // aligns label glyph with bounding rectangle.  Will be zero for billboards because dimensions and imageSize will be equal
    vec2 translation = v_originTextureCoordinateAndTranslate.zw;
    if (translation != vec2(0.0))
    {
        // this is only needed for labels where the horizontal origin is not LEFT
        // it moves the label back to where the "origin" should be since all label glyphs are set to HorizontalOrigin.LEFT
        translation += (dimensions * v_originTextureCoordinateAndTranslate.xy * vec2(0, -1));
    }

    vec2 st = ((lookupVector - translation + labelOffset) + gl_FragCoord.xy) / czm_viewport.zw;

    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st));

    if (logDepthOrDepth == 0.0)
    {
        return 0.0; // not on the globe
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
    if (v_eyeDepthAndDistance.x > -v_eyeDepthAndDistance.y) {
        vec2 adjustedST = v_textureCoordinates - v_textureCoordinateBounds.xy;
        adjustedST = adjustedST / vec2(v_textureCoordinateBounds.z - v_textureCoordinateBounds.x, v_textureCoordinateBounds.w - v_textureCoordinateBounds.y);

        float epsilonEyeDepth = v_eyeDepthAndDistance.x + czm_epsilon5;
        float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinateAndTranslate.xy);

        // negative values go into the screen
        if (globeDepth1 != 0.0 && globeDepth1 > epsilonEyeDepth)
        {
            float globeDepth2 = getGlobeDepth(adjustedST, v_leftAndRightTextureCoordinate.xy);
            if (globeDepth2 != 0.0 && globeDepth2 > epsilonEyeDepth)
            {
                float globeDepth3 = getGlobeDepth(adjustedST, v_leftAndRightTextureCoordinate.zw);
                if (globeDepth3 != 0.0 && globeDepth3 > epsilonEyeDepth)
                {
                    discard;
                }
            }
        }
    }
#endif

}
