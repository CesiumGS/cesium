float getSignedDistance(vec2 uv, highp sampler2D clippingDistance) {
    float signedDistance = texture(clippingDistance, uv).r;
    return (signedDistance - 0.5) * 2.0;
}

void czm_clipPolygons(highp sampler2D clippingDistance, vec2 clippingDistanceTextureDimensions, int polygonsLength, highp vec2 clippingPosition, int polygonIndex) {
    // Position is completely outside of polygons bounds
    vec2 rectUv = clippingPosition;
    if (rectUv.x <= 0.0 || rectUv.y <= 0.0 || rectUv.x >= 1.0 || rectUv.y >= 1.0) {
        #ifdef CLIPPING_INVERSE 
            discard;
        #endif
        return;
    }

    vec2 sampleOffset = max(1.0 / clippingDistanceTextureDimensions, vec2(0.005));
    float dimension = max(ceil(log2(float(polygonsLength))), float(polygonsLength));
    vec2 polygonTextureSize = clippingDistanceTextureDimensions / dimension;

    vec2 textureOffset = vec2(mod(float(polygonIndex), dimension), floor(float(polygonIndex) / dimension)) / dimension;
    vec2 uv = textureOffset + rectUv / dimension;

    vec2 pixelAlignedUv = (floor(uv / sampleOffset)) * sampleOffset;
    vec2 t = (uv - pixelAlignedUv) / sampleOffset;

    float sample00 = getSignedDistance(pixelAlignedUv + vec2(0.0, 0.0) * sampleOffset, clippingDistance);
    float sample01 = getSignedDistance(pixelAlignedUv + vec2(1.0, 0.0) * sampleOffset, clippingDistance);
    float sample10 = getSignedDistance(pixelAlignedUv + vec2(0.0, 1.0) * sampleOffset, clippingDistance);
    float sample11 = getSignedDistance(pixelAlignedUv + vec2(1.0, 1.0) * sampleOffset, clippingDistance);

    // linearly interpolate the samples based on the actual position
    vec2 d0 = vec2(sample00, sample01);
    vec2 d1 = vec2(sample10, sample11);
    vec2 d = mix(d0, d1, t.y);  
    float signedDistance = mix(d.x, d.y, t.x);

    #ifdef CLIPPING_INVERSE 
    if (signedDistance > 0.0)  {
        discard;
    }
    #else
    if (signedDistance < 0.0)  {
        discard;
    }
    #endif
}