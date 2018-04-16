float czm_reverseLogDepth(float logZ)
{
#ifdef LOG_DEPTH
    float near = czm_currentFrustum.x;
    float far = czm_currentFrustum.y;
    logZ = pow(2.0, logZ * log2(far + 1.0)) - 1.0;
    logZ = far * (1.0 - near / logZ) / (far - near);
#endif
    return logZ;
}
