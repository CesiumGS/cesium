/**
 * This vertex shader derives each vertex's UV coordinate within the rectangle that the vector lookup textures were baked for.
 * This UV is a normalized vec2, where [0,1] spans the rectangle. The fragment shader then samples the lookup textures with this uv,
 * whose contents live in the same uv space. See {@link ModelVectorLookupStageFS.glsl}.
 *
 * To get this uv, we need each vertex's geodetic (lon, lat), normalized against the baked rectangle.
 * What makes this complicated is precision: we *cannot* use v_positionWC, because it only has 32-bit precision and is too large to be represented precisely.
 * (Moreover, even representing v_positionWC with hi/lo components to emulate double precision, we could not perform the trig and other ops needed to derive lat/lon.)
 * Instead, we use v_positionEC, and let {@link czm_eyeToCartographicDelta} compute a geodetic delta (long, lat) between the camera and vertex. This delta is a smaller quantity (and gets smaller and more precise as we zoom in).
 * Then, we can combine this delta with the camera's own UV coordinate within the baked rectangle to obtain the vertex's uv coordinate.
 */
void modelVectorLookupStage(ProcessedAttributes attributes)
{
    // (We don't need the height component)
    vec2 delta = czm_eyeToCartographicDelta(v_positionEC).xy;

    // Express the vertex's position within the baked rectangle as a normalized uv coordinate, by adding the camera's uv and scaling by the rectangle's size.
    // Since the camera's UV is computed on the CPU in double precision, and gets more precise as one zooms in, this ensures good precision on the vertex's uv.
    v_vectorUv = u_vectorCameraUv + delta * u_vectorRectangleInverseSize;
}
