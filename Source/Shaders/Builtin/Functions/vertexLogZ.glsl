#ifdef LOG_DEPTH
varying float v_logZ;
varying vec3 v_logPositionEC;
#endif

void czm_updateZ() {
#ifdef LOG_DEPTH
    v_logPositionEC = (czm_inverseProjection * gl_Position).xyz;

    gl_Position.z = log2(max(1e-6, 1.0 + gl_Position.w)) * czm_logFarDistance - 1.0;
    gl_Position.z *= gl_Position.w;
#endif
}

void czm_vertexLogZ()
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + gl_Position.w;
    czm_updateZ();
#endif
}

void czm_vertexLogZ(vec4 clipCoords)
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + clipCoords.w;
    czm_updateZ();
#endif
}
