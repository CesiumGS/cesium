void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(v_positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);

    float padding = 0.005 / czm_geometricToleranceOverMeter;
    for (int regionIndex = 0; regionIndex < CLIPPING_POLYGON_REGIONS_LENGTH; regionIndex++) {
        vec4 extents = czm_unpackClippingExtents(model_clippingExtents, regionIndex);
        
        vec2 rectUv = (sphericalLatLong.yx - extents.yx) * extents.wz;
        if (rectUv.x > -padding && rectUv.y > -padding && rectUv.x < 1.0 + padding && rectUv.y < 1.0 + padding) {
            v_clippingPosition = rectUv;
            v_regionIndex = regionIndex;
            return;
        }
    }

    v_clippingPosition = vec2(czm_infinity);
    v_regionIndex = -1;
}
