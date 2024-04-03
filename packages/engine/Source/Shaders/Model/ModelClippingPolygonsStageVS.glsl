void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec2 extentsTextureDimensions = vec2(CLIPPING_EXTENTS_TEXTURE_WIDTH, CLIPPING_EXTENTS_TEXTURE_HEIGHT);

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(v_positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);

    float padding = 0.005 / czm_geometricToleranceOverMeter;
    for (int regionIndex = 0; regionIndex < CLIPPING_POLYGON_REGIONS_LENGTH; regionIndex++) {
        vec4 extents = czm_unpackClippingExtents(model_clippingExtents, extentsTextureDimensions, regionIndex);
        
        vec2 rectUv = (sphericalLatLong.yx - extents.yx) * extents.wz;
        if (rectUv.x > -padding && rectUv.y > -padding && rectUv.x < 1.0 + padding && rectUv.y < 1.0 + padding) {
            v_clippingPositionAndRegionIndex = vec3(rectUv, float(regionIndex));
            return;
        }
    }

    v_clippingPositionAndRegionIndex = vec3(czm_infinity, czm_infinity, -1.0);
}
