float czm_reverseLogDepth(float logZ)
{
#ifdef LOG_DEPTH
    float near = czm_currentFrustum.x;
    float far = czm_currentFrustum.y;
    float log2Depth = logZ * czm_log2FarDepthFromNearPlusOne;
    float depthFromNear = (exp2(log2Depth) - 1.0) / near;
    return czm_inverseFrustumDepthRatio * (1.0 - 1.0 / (depthFromNear + 1.0));
#endif
    return logZ;
}
