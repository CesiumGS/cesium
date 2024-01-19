void atmosphereStage(ProcessedAttributes attributes) {
    if (u_perFragmentGroundAtmosphere) {
        return;
    }

    vec3 lightDirectionWC = czm_getDynamicAtmosphereLightDirection(v_positionWC, czm_atmosphereDynamicLighting);
    czm_computeGroundAtmosphereScattering(
        // This assumes the geometry stage came before this.
        v_positionWC,
        lightDirectionWC,
        v_atmosphereRayleighColor,
        v_atmosphereMieColor,
        v_atmosphereOpacity
    );
}
