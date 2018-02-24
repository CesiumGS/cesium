#ifdef LOG_DEPTH
varying float v_logZ;
#endif

void czm_vertexLogZ()
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + gl_Position.w;
#endif
}

void czm_vertexLogZ(vec4 clipCoords)
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + clipCoords.w;
#endif
}
