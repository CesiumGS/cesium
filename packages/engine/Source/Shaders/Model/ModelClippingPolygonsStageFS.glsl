void clipPolygons(highp sampler2D clipAmount, int polygonLength, inout vec4 color) {
    vec2 uv = v_clipUv;

    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
        return;
    }

    bool inside = texture(clipAmount, uv).r < 0.01;
    if (inside) {
        color.r = -texture(clipAmount, uv).r;
    } else {
        color.b = texture(clipAmount, uv).r;
    }
    return;

    #ifdef CLIPPING_INVERSE
    if (!inside) {
        discard;
    }
    #else
    if (inside) {
        discard;
    }
    #endif
}

void modelClippingPolygonsStage(inout vec4 color)
{
    clipPolygons(model_clipAmount, CLIPPING_POLYGONS_LENGTH, color);
}
