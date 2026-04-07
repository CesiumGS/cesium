void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(v_positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);

    v_regionIndex = -1;
    v_clippingPosition = vec2(czm_infinity);

    for (int regionIndex = 0; regionIndex < CLIPPING_POLYGON_REGIONS_LENGTH; regionIndex++) {
        vec4 extents = czm_unpackClippingExtents(model_clippingExtents, regionIndex);
        vec2 rectUv = (sphericalLatLong.yx - extents.yx) * extents.wz;
        float threshold = 0.01;
        if (rectUv.x > threshold && rectUv.y > threshold && rectUv.x < 1.0 - threshold && rectUv.y < 1.0 - threshold) {
            v_clippingPosition = rectUv;
            v_regionIndex = regionIndex;
            continue;   // regions should never overlap so first match is ok
        }
    }
}
