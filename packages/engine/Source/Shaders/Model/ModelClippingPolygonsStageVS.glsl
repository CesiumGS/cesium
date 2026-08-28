/**
 * This vertex shader derives each vertex's UV coordinate within the model's clipping rectangle (its ellipsoid footprint).
 * This UV is a normalized vec2, where [0,1] spans the rectangle. The fragment shader then compares each fragment's uv against the clipping polygons,
 * whose positions live in the same uv space. See {@link ModelClippingPolygonsStageFS.glsl}.
 *
 * To get this uv, we need each vertex's geodetic (lon, lat), normalized against the model's rectangle.
 * What makes this complicated is precision: we *cannot* use v_positionWC, because it only has 32-bit precision and is too large to be represented precisely.
 * (Moreover, even representing v_positionWC with hi/lo components to emulate double precision, we could not perform the trig and other ops needed to derive lat/lon.)
 * Instead, we use v_positionEC, and let {@link czm_eyeToCartographicDelta} compute a geodetic delta (long, lat) between the camera and vertex. This delta is a smaller quantity (and gets smaller and more precise as we zoom in).
 * Then, we can combine this delta with the camera's own UV coordinate within the model's rectangle to obtain the vertex's uv coordinate.
 *
 * Ultimately, all this shader does is some geometry to obtain the vertex's relative position within the bounds of the model's geodetic rectangle.
 * The complexity arises from doing so in a way that preserves precision.
 */
void modelClippingPolygonsStage()
{
    // (We don't need the height component)
    vec2 delta = czm_eyeToCartographicDelta(v_positionEC).xy;

    // Express the vertex's position within the model's rectangle as a normalized uv coordinate, by adding the camera's uv and scaling by the rectangle's size.
    // Since the camera's UV is computed on the CPU in double precision, and gets more precise as one zooms in, this ensures good precision on the vertex's uv.
    v_clippingUv = u_clippingCameraUv + delta * u_clippingRectangleInverseSize;
}
