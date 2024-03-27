void modelClippingPolygonsStage(ProcessedAttributes attributes)
{
    vec3 positionWC = (czm_model * vec4(attributes.positionMC, 1.0)).xyz;

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(positionWC);
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    
    v_clippingPosition = vec2(sphericalLatLong.y, sphericalLatLong.x);
}
