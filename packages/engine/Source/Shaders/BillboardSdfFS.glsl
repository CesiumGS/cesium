// Get the distance from the edge of a glyph at the given coordinates sampling an SDF texture.
float getDistance(sampler2D textureAtlas, vec2 textureCoordinates)
{
    return texture(textureAtlas, textureCoordinates).r;
}

// Samples the sdf texture at the given coordinates and produces a color based on the fill color and the outline.
vec4 sampleSdfColor(sampler2D textureAtlas, vec2 textureCoordinates, vec4 fillColor, vec4 outlineColor, float outlineWidth, float smoothing)
{
    float distance = getDistance(textureAtlas, textureCoordinates);

    if (outlineWidth > 0.0)
    {
        // Don't get the outline edge exceed the SDF_EDGE
        float outlineEdge = clamp(SDF_EDGE - outlineWidth, 0.0, SDF_EDGE);
        float outlineFactor = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);
        vec4 sdfColor = mix(outlineColor, fillColor, outlineFactor);
        float alpha = smoothstep(outlineEdge - smoothing, outlineEdge + smoothing, distance);
        return vec4(sdfColor.rgb, sdfColor.a * alpha);
    }
    else
    {
        float alpha = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);
        return vec4(fillColor.rgb, fillColor.a * alpha);
    }
}

vec4 getSdfColor(sampler2D textureAtlas, vec2 textureCoordinates, vec4 fillColor, vec4 outlineColor, float outlineWidth) {

    // Get the current distance
    float distance = getDistance(textureAtlas, textureCoordinates);

#if (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))
    float smoothing = fwidth(distance);
    // Get an offset that is approximately half the distance to the neighbor pixels
    // 0.354 is approximately half of 1/sqrt(2)
    vec2 sampleOffset = 0.354 * vec2(dFdx(textureCoordinates) + dFdy(textureCoordinates));

    // Sample the center point
    vec4 center = sampleSdfColor(textureAtlas, textureCoordinates, fillColor, outlineColor, outlineWidth, smoothing);

    // Sample the 4 neighbors
    vec4 color1 = sampleSdfColor(textureAtlas, textureCoordinates + vec2(sampleOffset.x, sampleOffset.y), fillColor, outlineColor, outlineWidth, smoothing);
    vec4 color2 = sampleSdfColor(textureAtlas, textureCoordinates + vec2(-sampleOffset.x, sampleOffset.y), fillColor, outlineColor, outlineWidth, smoothing);
    vec4 color3 = sampleSdfColor(textureAtlas, textureCoordinates + vec2(-sampleOffset.x, -sampleOffset.y), fillColor, outlineColor, outlineWidth, smoothing);
    vec4 color4 = sampleSdfColor(textureAtlas, textureCoordinates + vec2(sampleOffset.x, -sampleOffset.y), fillColor, outlineColor, outlineWidth, smoothing);

    // Equally weight the center sample and the 4 neighboring samples
    vec4 color = (center + color1 + color2 + color3 + color4)/5.0;
#else
    // If no derivatives available (IE 10?), just do a single sample
    float smoothing = 1.0/32.0;
    vec4 color = sampleSdfColor(textureAtlas, textureCoordinates, fillColor, outlineColor, outlineWidth, smoothing);
#endif

    color = czm_gammaCorrect(color);
    return color;
}