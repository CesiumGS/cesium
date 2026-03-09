uniform sampler2D u_atlas;
uniform float u_coarseDepthTestDistance;
uniform float u_threePointDepthTestDistance;

#ifdef VECTOR_TILE
uniform vec4 u_highlightColor;
#endif

in vec2 v_textureCoordinates;
in vec4 v_pickColor;
in vec4 v_color;
flat in vec2 v_splitDirectionAndEllipsoidDepthEC;

#ifdef SDF
in vec4 v_outlineColor;
in float v_outlineWidth;
#endif

in vec4 v_compressed;                               // x: eyeDepth, y: applyTranslate & enableDepthCheck, z: dimensions, w: imageSize
const float SHIFT_LEFT1 = 2.0;
const float SHIFT_RIGHT1 = 1.0 / 2.0;

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

bool getDepthTestEnabled() {
    float temp = v_compressed.y;
    temp = temp * SHIFT_RIGHT1;
    float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;
    return temp2 != 0.0;
}

float getRelativeEyeDepth(float eyeDepth, float distanceToEllipsoid, float epsilon) {
    float depthDifferential = eyeDepth - distanceToEllipsoid;
    float depthRatio = abs(depthDifferential / distanceToEllipsoid);
    if (depthRatio < epsilon) {
        // The approximations are imprecise, so use an epsilon check for small value differences and assume a value of 0.0
        return 0.0;
    }

    return depthDifferential;
}

// Extra manual depth testing is done to allow more control over how a billboard is occluded
// by the globe when near and far from the camera.
void doDepthTest(float eyeDepth, float globeDepth) {

#ifdef VS_THREE_POINT_DEPTH_CHECK
    // Since discarding vertices is not possible, the vertex shader sets eyeDepth to 0 to indicate the depth test failed. Apply the discard here.
    if (eyeDepth > -u_threePointDepthTestDistance) {
        if (eyeDepth == 0.0) {
            discard;
        }
        return;
    }
#endif
    bool useGlobeDepth = eyeDepth > -u_coarseDepthTestDistance;
    if (useGlobeDepth && globeDepth == 0.0) {
        // Pixel is not on the globe, so there is no distance to compare against. Pass.
        return;
    }

    // If the camera is close, compare against the globe depth texture that includes depth from the 3D tile pass.
    if (useGlobeDepth && getRelativeEyeDepth(eyeDepth, globeDepth, czm_epsilon1) < 0.0) {
        discard;
    }
}

#ifdef LOG_DEPTH
void writeDepth(float eyeDepth, float globeDepth, float distanceToEllipsoid) {
    // If we've made it here, the manual depth test above determined that this fragment should be visible.
    // But the automatic depth test must still run in order to write the result to the depth buffer, and its results may
    // disagree with our manual depth test's results. To prefer our manual results when in front of the globe, apply an offset towards the camera.

    float depthArg = v_depthFromNearPlusOne;

    if (globeDepth != 0.0 && getRelativeEyeDepth(eyeDepth, distanceToEllipsoid, czm_epsilon3) > 0.0) {
        float globeDepthFromNearPlusOne = (-globeDepth - czm_currentFrustum.x) + 1.0;
        float nudge = max(globeDepthFromNearPlusOne * 5e-6, czm_epsilon7);
        float globeOnTop = max(1.0, globeDepthFromNearPlusOne - nudge);
        depthArg = min(depthArg, globeOnTop);
    }

    czm_writeLogDepth(depthArg);
}
#endif

void main()
{
    if (v_splitDirectionAndEllipsoidDepthEC.x < 0.0 && gl_FragCoord.x > czm_splitPosition) {
        discard;
    }
    if (v_splitDirectionAndEllipsoidDepthEC.x > 0.0 && gl_FragCoord.x < czm_splitPosition) {
        discard;
    }

    if (getDepthTestEnabled()) {
        vec2 fragSt = gl_FragCoord.xy / czm_viewport.zw;
        float eyeDepth = v_compressed.x;
        float globeDepth = getGlobeDepthAtCoords(fragSt);
        float distanceToEllipsoid = -v_splitDirectionAndEllipsoidDepthEC.y;
        doDepthTest(eyeDepth, globeDepth);

        #ifdef LOG_DEPTH
        writeDepth(eyeDepth, globeDepth, distanceToEllipsoid);
        #endif
    }

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
}
