void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(v_positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);

    float minDistanceSquared = czm_infinity;
    v_regionIndex = -1;
    v_clippingPosition = vec2(czm_infinity);

    for (int regionIndex = 0; regionIndex < CLIPPING_POLYGON_REGIONS_LENGTH; regionIndex++) {
        vec4 extents = czm_unpackClippingExtents(model_clippingExtents, regionIndex);
        vec2 rectUv = (sphericalLatLong.yx - extents.yx) * extents.wz;

        vec2 clamped = clamp(rectUv, vec2(0.0), vec2(1.0));
        vec2 distance = abs(rectUv - clamped);
        float distancedSquared = distance.x * distance.x + distance.y * distance.y;

        if (distancedSquared < minDistanceSquared) {
            minDistanceSquared = distancedSquared;
            v_minDistance = distance;
            v_clippingPosition = rectUv;
            v_regionIndex = regionIndex;
        }
    }
}
