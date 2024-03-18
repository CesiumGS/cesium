float getSignedDistance(vec2 uv, highp sampler2D clipAmount, float smoothing) {
    float smoothedValue = smoothstep(-smoothing, 1.0 + smoothing, texture(clipAmount, uv).r);
    return (smoothedValue - 0.5) * 2.0;
}

void clipPolygons(highp sampler2D clipAmount, int polygonLength, inout vec4 color) {
    vec2 sampleOffset = 1.0 / vec2(CLIPPING_POLYGONS_TEXTURE_HEIGHT, CLIPPING_POLYGONS_TEXTURE_WIDTH);
    vec2 uv = v_clipUv;

    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
        return;
    }

    float smoothing = fwidth(texture(clipAmount, uv).r);
     float d = getSignedDistance(uv, clipAmount, smoothing);
    

    int radius = 2;
    float signedDistance = d;
    for (int i = -radius; i <= radius; ++i) {
        for (int j = -radius; j <= radius; ++j) {
            vec2 offset = vec2(sampleOffset.x * float(i), sampleOffset.y * float(j));
            float s = getSignedDistance(uv + offset, clipAmount, smoothing);
            signedDistance += s;
        }
    }
    signedDistance /= float(radius * 2 + 1);

    #ifdef CLIPPING_INVERSE 

    #else
    if (signedDistance < 0.0)  {
        discard;
    }
    #endif
}

void modelClippingPolygonsStage(inout vec4 color)
{
    clipPolygons(model_clipAmount, CLIPPING_POLYGONS_LENGTH, color);
}
