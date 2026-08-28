/**
 * Derives each vertex's UV within the rectangle the lookup textures were baked for, where [0,1] spans the rectangle.
 * {@link ModelVectorLookupStageFS.glsl} samples those textures with it.
 *
 * v_positionWC is unusable here: it is 32-bit and too large to resolve a geodetic position precisely, and splitting it
 * into hi/lo components would still not support the trigonometry needed to derive longitude and latitude. Instead,
 * {@link czm_eyeToCartographicDelta} returns a geodetic delta from the camera to the vertex, a small quantity that
 * grows more precise as the camera approaches. Adding it to the camera's own UV, computed on the CPU in double
 * precision, keeps the result precise across the rectangle.
 */
void modelVectorLookupStage(ProcessedAttributes attributes)
{
    vec2 delta = czm_eyeToCartographicDelta(v_positionEC).xy;
    v_vectorUv = u_vectorCameraUv + delta * u_vectorRectangleInverseSize;
}
