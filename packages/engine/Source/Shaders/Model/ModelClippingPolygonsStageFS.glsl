void clipPolygons(vec4 fragCoord, highp sampler2D clipAmount, vec4 rectangle, int polygonLength) {
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord);
    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;
    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    float x = sphericalLatLong.x;
    float y = sphericalLatLong.y;

    bool inside = false;
    int lastPolygonIndex = 0;
    // for (int polygonIndex = 0; polygonIndex < polygonLength && !inside; ++polygonIndex) {

    // }

    vec2 extents = rectangle.yw - rectangle.xz;
    vec2 uv = vec2((x - rectangle.x) / extents.x, (y - rectangle.y) / extents.y);
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 0.0) {
        return;
    }

    inside = texture(clipAmount, uv).x < 0.0;

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
    clipPolygons(gl_FragCoord, model_clipAmount, model_clipRectangle, CLIPPING_POLYGONS_LENGTH);
}
