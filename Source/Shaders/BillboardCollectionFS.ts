//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D u_atlas;\n\
\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
\n\
varying vec2 v_textureCoordinates;\n\
varying vec4 v_pickColor;\n\
varying vec4 v_color;\n\
\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
varying vec4 v_textureCoordinateBounds;                  // the min and max x and y values for the texture coordinates\n\
varying vec4 v_originTextureCoordinateAndTranslate;      // texture coordinate at the origin, billboard translate (used for label glyphs)\n\
varying vec4 v_compressed;                               // x: eyeDepth, y: applyTranslate & enableDepthCheck, z: dimensions, w: imageSize\n\
varying mat2 v_rotationMatrix;\n\
\n\
const float SHIFT_LEFT12 = 4096.0;\n\
const float SHIFT_LEFT1 = 2.0;\n\
\n\
const float SHIFT_RIGHT12 = 1.0 / 4096.0;\n\
const float SHIFT_RIGHT1 = 1.0 / 2.0;\n\
\n\
float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST, bool applyTranslate, vec2 dimensions, vec2 imageSize)\n\
{\n\
    vec2 lookupVector = imageSize * (depthLookupST - adjustedST);\n\
    lookupVector = v_rotationMatrix * lookupVector;\n\
    vec2 labelOffset = (dimensions - imageSize) * (depthLookupST - vec2(0.0, v_originTextureCoordinateAndTranslate.y)); // aligns label glyph with bounding rectangle.  Will be zero for billboards because dimensions and imageSize will be equal\n\
\n\
    vec2 translation = v_originTextureCoordinateAndTranslate.zw;\n\
\n\
    if (applyTranslate)\n\
    {\n\
        // this is only needed for labels where the horizontal origin is not LEFT\n\
        // it moves the label back to where the \"origin\" should be since all label glyphs are set to HorizontalOrigin.LEFT\n\
        translation += (dimensions * v_originTextureCoordinateAndTranslate.xy * vec2(1.0, 0.0));\n\
    }\n\
\n\
    vec2 st = ((lookupVector - translation + labelOffset) + gl_FragCoord.xy) / czm_viewport.zw;\n\
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st));\n\
\n\
    if (logDepthOrDepth == 0.0)\n\
    {\n\
        return 0.0; // not on the globe\n\
    }\n\
\n\
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);\n\
    return eyeCoordinate.z / eyeCoordinate.w;\n\
}\n\
#endif\n\
\n\
void main()\n\
{\n\
    vec4 color = texture2D(u_atlas, v_textureCoordinates) * v_color;\n\
\n\
// Fully transparent parts of the billboard are not pickable.\n\
#if !defined(OPAQUE) && !defined(TRANSLUCENT)\n\
    if (color.a < 0.005)   // matches 0/255 and 1/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
// The billboard is rendered twice. The opaque pass discards translucent fragments\n\
// and the translucent pass discards opaque fragments.\n\
#ifdef OPAQUE\n\
    if (color.a < 0.995)   // matches < 254/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
    if (color.a >= 0.995)  // matches 254/255 and 255/255\n\
    {\n\
        discard;\n\
    }\n\
#endif\n\
#endif\n\
\n\
#ifdef VECTOR_TILE\n\
    color *= u_highlightColor;\n\
#endif\n\
    gl_FragColor = color;\n\
\n\
    czm_writeLogDepth();\n\
\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
    float temp = v_compressed.y;\n\
\n\
    temp = temp * SHIFT_RIGHT1;\n\
\n\
    float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;\n\
    bool enableDepthTest = temp2 != 0.0;\n\
    bool applyTranslate = floor(temp) != 0.0;\n\
\n\
    if (enableDepthTest) {\n\
        temp = v_compressed.z;\n\
        temp = temp * SHIFT_RIGHT12;\n\
\n\
        vec2 dimensions;\n\
        dimensions.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
        dimensions.x = floor(temp);\n\
\n\
        temp = v_compressed.w;\n\
        temp = temp * SHIFT_RIGHT12;\n\
\n\
        vec2 imageSize;\n\
        imageSize.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
        imageSize.x = floor(temp);\n\
\n\
        vec2 adjustedST = v_textureCoordinates - v_textureCoordinateBounds.xy;\n\
        adjustedST = adjustedST / vec2(v_textureCoordinateBounds.z - v_textureCoordinateBounds.x, v_textureCoordinateBounds.w - v_textureCoordinateBounds.y);\n\
\n\
        float epsilonEyeDepth = v_compressed.x + czm_epsilon1;\n\
        float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinateAndTranslate.xy, applyTranslate, dimensions, imageSize);\n\
\n\
        // negative values go into the screen\n\
        if (globeDepth1 != 0.0 && globeDepth1 > epsilonEyeDepth)\n\
        {\n\
            float globeDepth2 = getGlobeDepth(adjustedST, vec2(0.0, 1.0), applyTranslate, dimensions, imageSize); // top left corner\n\
            if (globeDepth2 != 0.0 && globeDepth2 > epsilonEyeDepth)\n\
            {\n\
                float globeDepth3 = getGlobeDepth(adjustedST, vec2(1.0, 1.0), applyTranslate, dimensions, imageSize); // top right corner\n\
                if (globeDepth3 != 0.0 && globeDepth3 > epsilonEyeDepth)\n\
                {\n\
                    discard;\n\
                }\n\
            }\n\
        }\n\
    }\n\
#endif\n\
\n\
}\n\
";
});