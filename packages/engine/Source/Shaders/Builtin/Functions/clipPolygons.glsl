float getSignedDistance(vec2 uv, highp sampler2D clippingDistance, float smoothing) {
    float smoothedValue = smoothstep(-smoothing, 1.0 + smoothing, texture(clippingDistance, uv).r);
    return (smoothedValue - 0.5) * 2.0;
}

vec2 getLookupUv(vec2 dimensions, int i) {
    int pixY = i / int(dimensions.x);
    int pixX = i - (pixY * int(dimensions.x));
    float pixelWidth = 1.0 / dimensions.x;
    float pixelHeight = 1.0 / dimensions.y;
    float u = (float(pixX) + 0.5) * pixelWidth; // sample from center of pixel
    float v = (float(pixY) + 0.5) * pixelHeight;
    return vec2(u, v);
}

vec4 getExtents(highp sampler2D extents, vec2 textureDimensions, int polygonIndex) {
    return texture(extents, getLookupUv(textureDimensions, polygonIndex));
}

void czm_clipPolygons(highp sampler2D extents, highp sampler2D clippingDistance, vec2 extentsTextureDimensions, vec2 clippingDistanceTextureDimensions, int polygonsLength, vec2 clippingPosition) {
    vec2 sampleOffset = 1.0 / clippingDistanceTextureDimensions;
    float dimension = max(ceil(log2(float(polygonsLength))), float(polygonsLength));

    #ifdef CLIPPING_INVERSE 
    bool clipped = true;
    #endif
    for (int polygonIndex = 0; polygonIndex < polygonsLength; polygonIndex++) {
       vec4 rectangle = getExtents(extents, extentsTextureDimensions, polygonIndex);
       vec2 extents = abs(rectangle.zw - rectangle.xy);

        // Outside of polygon bounds is completely outside the polygon
        vec2 rectUv = (clippingPosition - rectangle.xy) / extents;
        if (rectUv.x <= 0.0 || rectUv.y <= 0.0 || rectUv.x >= 1.0 || rectUv.y >= 1.0) {
            continue;
        }

        vec2 textureOffset = vec2(mod(float(polygonIndex), dimension), floor(float(polygonIndex) / dimension)) / dimension;
        vec2 uv = textureOffset + rectUv / dimension;

        float smoothing = fwidth(texture(clippingDistance, uv).r);
        float d = getSignedDistance(uv, clippingDistance, smoothing);
        
        int radius = 0; // TODO: Fix sampling radius
        float signedDistance = 0.0;
        for (int i = -radius; i <= radius; ++i) {
            for (int j = -radius; j <= radius; ++j) {
                vec2 offset = vec2(sampleOffset.x * float(i), sampleOffset.y * float(j));
                float s = getSignedDistance(uv + offset, clippingDistance, smoothing);
                signedDistance += s;
            }
        }
        signedDistance /= float(radius * 2 + 1);

        #ifdef CLIPPING_INVERSE 
        if (signedDistance <= 0.0)  {
            clipped = false;
            break;
        }
        #else
        if (signedDistance < 0.0)  {
            discard;
        }
        #endif
    }

    #ifdef CLIPPING_INVERSE 
    if (clipped) {
        discard;
    }
    #endif
}