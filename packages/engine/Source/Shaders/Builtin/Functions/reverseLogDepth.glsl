float czm_reverseLogDepth(float logZ)
{
#ifdef LOG_DEPTH
    float near = czm_currentFrustum.x;
    float far = czm_currentFrustum.y;
    float log2Depth = logZ * czm_log2FarDepthFromNearPlusOne;
    float depthFromNear = exp2(log2Depth) - 1.0;
    return far * (1.0 - near / (depthFromNear + near)) / (far - near);
#endif
    return logZ;
}
