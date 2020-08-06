#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

uniform sampler2D u_atlas;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

varying vec2 v_textureCoordinates;
varying vec4 v_pickColor;
varying vec4 v_color;

#ifdef SDF
varying vec4 v_outlineColor;
varying float v_outlineWidth;
#endif

#ifdef FRAGMENT_DEPTH_CHECK
varying vec4 v_textureCoordinateBounds;                  // the min and max x and y values for the texture coordinates
varying vec4 v_originTextureCoordinateAndTranslate;      // texture coordinate at the origin, billboard translate (used for label glyphs)
varying vec4 v_compressed;                               // x: eyeDepth, y: applyTranslate & enableDepthCheck, z: dimensions, w: imageSize
varying mat2 v_rotationMatrix;

const float SHIFT_LEFT12 = 4096.0;
const float SHIFT_LEFT1 = 2.0;

const float SHIFT_RIGHT12 = 1.0 / 4096.0;
const float SHIFT_RIGHT1 = 1.0 / 2.0;

float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST, bool applyTranslate, vec2 dimensions, vec2 imageSize)
{
    vec2 lookupVector = imageSize * (depthLookupST - adjustedST);
    lookupVector = v_rotationMatrix * lookupVector;
    vec2 labelOffset = (dimensions - imageSize) * (depthLookupST - vec2(0.0, v_originTextureCoordinateAndTranslate.y)); // aligns label glyph with bounding rectangle.  Will be zero for billboards because dimensions and imageSize will be equal

    vec2 translation = v_originTextureCoordinateAndTranslate.zw;

    if (applyTranslate)
    {
        // this is only needed for labels where the horizontal origin is not LEFT
        // it moves the label back to where the "origin" should be since all label glyphs are set to HorizontalOrigin.LEFT
        translation += (dimensions * v_originTextureCoordinateAndTranslate.xy * vec2(1.0, 0.0));
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


#ifdef SDF

// Get the distance from the edge of a glyph at a given position sampling an SDF texture.
float getDistance(vec2 position)
{
    return texture2D(u_atlas, position).r;
}

// Samples the sdf texture at the given position and produces a color based on the fill color and the outline.
vec4 getSDFColor(vec2 position, float outlineWidth, vec4 outlineColor, float smoothing)
{
    float distance = getDistance(position);

    if (outlineWidth > 0.0)
    {
        // Don't get the outline edge exceed the SDF_EDGE
        float outlineEdge = clamp(SDF_EDGE - outlineWidth, 0.0, SDF_EDGE);
        float outlineFactor = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);
        vec4 sdfColor = mix(outlineColor, v_color, outlineFactor);
        float alpha = smoothstep(outlineEdge - smoothing, outlineEdge + smoothing, distance);
        return vec4(sdfColor.rgb, sdfColor.a * alpha);
    }
    else
    {
        float alpha = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);
        return vec4(v_color.rgb, v_color.a * alpha);
    }
}
#endif

void main()
{
    vec4 color = texture2D(u_atlas, v_textureCoordinates);

#ifdef SDF
    float outlineWidth = v_outlineWidth;
    vec4 outlineColor = v_outlineColor;

    // Get the current distance
    float distance = getDistance(v_textureCoordinates);

#ifdef GL_OES_standard_derivatives
    float smoothing = fwidth(distance);
    // Get an offset that is approximately half the distance to the neighbor pixels
    // 0.354 is approximately half of 1/sqrt(2)
    vec2 sampleOffset = 0.354 * vec2(dFdx(v_textureCoordinates) + dFdy(v_textureCoordinates));

    // Sample the center point
    vec4 center = getSDFColor(v_textureCoordinates, outlineWidth, outlineColor, smoothing);

    // Sample the 4 neighbors
    vec4 color1 = getSDFColor(v_textureCoordinates + vec2(sampleOffset.x, sampleOffset.y), outlineWidth, outlineColor, smoothing);
    vec4 color2 = getSDFColor(v_textureCoordinates + vec2(-sampleOffset.x, sampleOffset.y), outlineWidth, outlineColor, smoothing);
    vec4 color3 = getSDFColor(v_textureCoordinates + vec2(-sampleOffset.x, -sampleOffset.y), outlineWidth, outlineColor, smoothing);
    vec4 color4 = getSDFColor(v_textureCoordinates + vec2(sampleOffset.x, -sampleOffset.y), outlineWidth, outlineColor, smoothing);

    // Equally weight the center sample and the 4 neighboring samples
    color = (center + color1 + color2 + color3 + color4)/5.0;
#else
    // Just do a single sample
    float smoothing = 1.0/32.0;
    color = getSDFColor(v_textureCoordinates, outlineWidth, outlineColor, smoothing);
#endif

    color = czm_gammaCorrect(color);
#else
    color = czm_gammaCorrect(color);
    color *= czm_gammaCorrect(v_color);
#endif

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

#ifdef LOG_DEPTH
    czm_writeLogDepth();
#endif

#ifdef FRAGMENT_DEPTH_CHECK
    float temp = v_compressed.y;

    temp = temp * SHIFT_RIGHT1;

    float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;
    bool enableDepthTest = temp2 != 0.0;
    bool applyTranslate = floor(temp) != 0.0;

    if (enableDepthTest) {
        temp = v_compressed.z;
        temp = temp * SHIFT_RIGHT12;

        vec2 dimensions;
        dimensions.y = (temp - floor(temp)) * SHIFT_LEFT12;
        dimensions.x = floor(temp);

        temp = v_compressed.w;
        temp = temp * SHIFT_RIGHT12;

        vec2 imageSize;
        imageSize.y = (temp - floor(temp)) * SHIFT_LEFT12;
        imageSize.x = floor(temp);

        vec2 adjustedST = v_textureCoordinates - v_textureCoordinateBounds.xy;
        adjustedST = adjustedST / vec2(v_textureCoordinateBounds.z - v_textureCoordinateBounds.x, v_textureCoordinateBounds.w - v_textureCoordinateBounds.y);

        float epsilonEyeDepth = v_compressed.x + czm_epsilon1;
        float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinateAndTranslate.xy, applyTranslate, dimensions, imageSize);

        // negative values go into the screen
        if (globeDepth1 != 0.0 && globeDepth1 > epsilonEyeDepth)
        {
            float globeDepth2 = getGlobeDepth(adjustedST, vec2(0.0, 1.0), applyTranslate, dimensions, imageSize); // top left corner
            if (globeDepth2 != 0.0 && globeDepth2 > epsilonEyeDepth)
            {
                float globeDepth3 = getGlobeDepth(adjustedST, vec2(1.0, 1.0), applyTranslate, dimensions, imageSize); // top right corner
                if (globeDepth3 != 0.0 && globeDepth3 > epsilonEyeDepth)
                {
                    discard;
                }
            }
        }
    }
#endif

}
