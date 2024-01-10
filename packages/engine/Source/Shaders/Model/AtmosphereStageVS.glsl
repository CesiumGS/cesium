void atmosphereStage(ProcessedAttributes attributes) {
    vec3 lightDirection = czm_getDynamicAtmosphereLightDirection(v_positionWC, czm_atmosphereDynamicLighting);

    czm_computeGroundAtmosphereScattering(
        // This assumes the geometry stage came before this.
        v_positionWC,
        lightDirection,
        v_atmosphereRayleighColor,
        v_atmosphereMieColor,
        v_atmosphereOpacity
    );
}
