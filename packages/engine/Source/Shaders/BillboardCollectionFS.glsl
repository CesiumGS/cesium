uniform sampler2D u_atlas;
uniform float u_coarseDepthTestDistance;
uniform float u_threePointDepthTestDistance;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

in vec2 v_textureCoordinates;
in vec4 v_pickColor;
in vec4 v_color;
in float v_splitDirection;

#ifdef SDF
in vec4 v_outlineColor;
in float v_outlineWidth;
#endif

in vec4 v_compressed;                               // x: eyeDepth, y: applyTranslate & enableDepthCheck, z: dimensions, w: imageSize
const float SHIFT_LEFT1 = 2.0;
const float SHIFT_RIGHT1 = 1.0 / 2.0;

#ifdef FS_THREE_POINT_DEPTH_CHECK
in vec4 v_textureCoordinateBounds;                  // the min and max x and y values for the texture coordinates
in vec4 v_originTextureCoordinateAndTranslate;      // texture coordinate at the origin, billboard translate (used for label glyphs)
in mat2 v_rotationMatrix;

const float SHIFT_LEFT12 = 4096.0;

const float SHIFT_RIGHT12 = 1.0 / 4096.0;
#endif

float getGlobeDepthAtCoords(vec2 st)
{
    float logDepthOrDepth = czm_unpackDepth(texture(czm_globeDepthTexture, st));
    if (logDepthOrDepth == 0.0)
    {
        return 0.0; // not on the globe
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    return eyeCoordinate.z / eyeCoordinate.w;
}

#ifdef FS_THREE_POINT_DEPTH_CHECK
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
    return getGlobeDepthAtCoords(st);
}
#endif

#ifdef SDF

// Get the distance from the edge of a glyph at a given position sampling an SDF texture.
float getDistance(vec2 position)
{
    return texture(u_atlas, position).r;
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

#ifdef FS_THREE_POINT_DEPTH_CHECK
void doThreePointDepthTest(float eyeDepth, bool applyTranslate) {

    if (eyeDepth < -u_threePointDepthTestDistance) return;
    float temp = v_compressed.z;
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
    if (globeDepth1 == 0.0 || globeDepth1 < epsilonEyeDepth) return;

    float globeDepth2 = getGlobeDepth(adjustedST, vec2(0.0, 1.0), applyTranslate, dimensions, imageSize); // top left corner
    if (globeDepth2 == 0.0 || globeDepth2 < epsilonEyeDepth) return;

    float globeDepth3 = getGlobeDepth(adjustedST, vec2(1.0, 1.0), applyTranslate, dimensions, imageSize); // top right corner
    if (globeDepth3 == 0.0 || globeDepth3 < epsilonEyeDepth) return;

    // All three key points are occluded, discard the fragment (and by extension the entire billboard)            
    discard;
}
#endif

// Extra manual depth testing is done to allow more control over how a billboard is occluded 
// by the globe when near and far from the camera.
void doDepthTest(float globeDepth) {
    float temp = v_compressed.y;
    temp = temp * SHIFT_RIGHT1;
    float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;
    bool enableDepthCheck = temp2 != 0.0;
    if (!enableDepthCheck) return;

    float eyeDepth = v_compressed.x;

#ifdef FS_THREE_POINT_DEPTH_CHECK
    // If the billboard is clamped to the ground and within a given distance, we do a 3-point depth test. This test is performed in the vertex shader, unless
    // vertex texture sampling is not supported, in which case we do it here.
    bool applyTranslate = floor(temp) != 0.0;
    doThreePointDepthTest(eyeDepth, applyTranslate);
    
#elif defined(VS_THREE_POINT_DEPTH_CHECK)
    // Since discarding vertices is not possible, the vertex shader sets eyeDepth to 0 to indicate the depth test failed. Apply the discard here.
    if (eyeDepth > -u_threePointDepthTestDistance) {
        if (eyeDepth == 0.0) {
            discard;
        }
        return;
    }
#endif

    // If we're far away, we just compare against a flat, camera-facing depth-plane at the ellipsoid's center.
    // If we're close, we compare against the globe depth texture (which includes depth from the 3D tile pass).

    if (globeDepth == 0.0) return; // Not on globe    
    float distanceToEllipsoidCenter = -length(czm_viewerPositionWC); // depth is negative by convention
    float testDistance = (eyeDepth > -u_coarseDepthTestDistance) ? globeDepth : distanceToEllipsoidCenter;
    if (eyeDepth < testDistance) {
        discard;
    }
}

void main()
{
    if (v_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard;
    if (v_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard;
    
    vec2 fragSt = gl_FragCoord.xy / czm_viewport.zw;
    float globeDepth = getGlobeDepthAtCoords(fragSt);
    doDepthTest(globeDepth);
    
    vec4 color = texture(u_atlas, v_textureCoordinates);

#ifdef SDF
    float outlineWidth = v_outlineWidth;
    vec4 outlineColor = v_outlineColor;

    // Get the current distance
    float distance = getDistance(v_textureCoordinates);

#if (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))
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
    // If no derivatives available (IE 10?), just do a single sample
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
    out_FragColor = color;

#ifdef LOG_DEPTH
    // If we've made it here, we passed our manual depth test, above. But the automatic depth test will
    // still run, and some fragments of the billboard may clip against the globe. To prevent that,
    // ensure the depth value we write out is in front of the globe depth.
    float depthArg = v_depthFromNearPlusOne;

    if (globeDepth != 0.0) { // On the globe
        float globeDepthFromNearPlusOne = (-globeDepth - czm_currentFrustum.x) + 1.0;
        float nudge = max(globeDepthFromNearPlusOne * 5e-6, czm_epsilon7);
        float globeOnTop = max(1.0, globeDepthFromNearPlusOne - nudge);
        depthArg = min(depthArg, globeOnTop);
    }

    czm_writeLogDepth(depthArg);
#endif
}