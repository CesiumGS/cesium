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

vec4 getExtents(int polygonIndex) {
    return texture(model_clippingExtents, getLookupUv(vec2(CLIPPING_EXTENTS_TEXTURE_WIDTH, CLIPPING_EXTENTS_TEXTURE_HEIGHT), polygonIndex));
}

void clipPolygons() {
    vec2 sampleOffset = 1.0 / vec2(CLIPPING_DISTANCE_TEXTURE_WIDTH, CLIPPING_DISTANCE_TEXTURE_HEIGHT);
    float dimension = ceil(log2(float(CLIPPING_POLYGONS_LENGTH + 1)));

    #ifdef CLIPPING_INVERSE 
    bool clipped = true;
    #endif
    for (int polygonIndex = 0; polygonIndex <= CLIPPING_POLYGONS_LENGTH; polygonIndex++) {
       vec4 rectangle = getExtents(polygonIndex);
       vec2 extents = abs(rectangle.zw - rectangle.xy);

       vec2 rectUv = vec2((v_clippingPosition.x - rectangle.x) / extents.x, (v_clippingPosition.y - rectangle.y) / extents.y);

        // Outside of polygon bounds
        if (rectUv.x <= 0.0 || rectUv.y <= 0.0 || rectUv.x >= 1.0 || rectUv.y >= 1.0) {
            continue;
        }

        vec2 textureOffset = vec2(mod(float(polygonIndex), dimension), floor(float(polygonIndex) / dimension)) / dimension;
       vec2 uv = textureOffset + rectUv / dimension;

        float smoothing = fwidth(texture(model_clippingDistance, uv).r);
        float d = getSignedDistance(uv, model_clippingDistance, smoothing);
        
        int radius = 0;
        float signedDistance = 0.0;
        for (int i = -radius; i <= radius; ++i) {
            for (int j = -radius; j <= radius; ++j) {
                vec2 offset = vec2(sampleOffset.x * float(i), sampleOffset.y * float(j));
                float s = getSignedDistance(uv + offset, model_clippingDistance, smoothing);
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

void modelClippingPolygonsStage()
{
    clipPolygons();
}
