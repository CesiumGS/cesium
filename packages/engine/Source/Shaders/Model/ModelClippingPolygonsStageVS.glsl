void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec3 positionWC = (czm_model * vec4(attributes.positionMC, 1.0)).xyz;

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    // float y = sphericalLatLong.x;
    // float x = sphericalLatLong.y;
    v_clipPosition = vec2(sphericalLatLong.y, sphericalLatLong.x);

    // vec4 rectangle = model_clipRectangle;
    // vec2 extents = abs(rectangle.zw - rectangle.xy);
    // v_clipUv = vec2((x - rectangle.x) / extents.x, (y - rectangle.y) / extents.y);
    // v_clipPixelSize = extents / vec2(CLIPPING_POLYGONS_TEXTURE_WIDTH, CLIPPING_POLYGONS_TEXTURE_HEIGHT);
}
