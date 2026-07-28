/**
 * This vertex shader derives each vertex's UV coordinate within the model's clipping rectangle (its ellipsoid footprint).
 * This UV is a normalized vec2, where [0,1] spans the rectangle. The fragment shader then compares each fragment's uv against the clipping polygons,
 * whose positions live in the same uv space. See {@link ModelClippingPolygonsStageFS.glsl}.
 *
 * To get this uv, we need each vertex's geodetic (lon, lat), normalized against the model's rectangle.
 * What makes this complicated is precision: we *cannot* use v_positionWC, because it only has 32-bit precision and is too large to be represented precisely.
 * (Moreover, even representing v_positionWC with hi/lo components to emulate double precision, we could not perform the trig and other ops needed to derive lat/lon.)
 * Instead, we use v_positionEC, and perform all computations as deltas from the camera.
 * By projecting v_positionEC onto the equatorial and meridional planes, we can compute a delta (long, lat) between the camera and vertex. This delta is a smaller quantity (and gets smaller and more precise as we zoom in).
 * Then, we can combine this delta with the camera's own UV coordinate within the model's rectangle to obtain the vertex's uv coordinate. (Note: the camera's UV is calculated in double on the CPU and passed as a uniform).
 *
 * Ultimately, all this shader does is some geometry to obtain the vertex's relative position within the bounds of the model's geodetic rectangle.
 * The complexity arises from doing so in a way that preserves precision.
 */
void modelClippingPolygonsStage()
{

    // A vector representing the camera-to-vertex offset, in an ENU oriented reference frame (centered at the camera)
    vec3 cameraToVertex = czm_eyeToEnu * v_positionEC;

    float cosLatitude = cos(czm_eyeCartographic.y);
    float sinLatitude = sin(czm_eyeCartographic.y);

    // To derive longitude, project the camera and vertex onto the equatorial plane, in a frame such that the camera lies along the +x axis. In this frame,
    // the vertex's (delta) longitude is simply the atan of its x and y components.
    float primeVerticalRadius = 1.0 / czm_eyeEllipsoidCurvature.x;
    vec2 cameraEquatorialPos = vec2((primeVerticalRadius + czm_eyeCartographic.z) * cosLatitude, 0.0);
    vec2 vertexEquatorialPos = cameraEquatorialPos + vec2(-cameraToVertex.y * sinLatitude + cameraToVertex.z * cosLatitude, cameraToVertex.x);
    float deltaLongitude = atan(vertexEquatorialPos.y, vertexEquatorialPos.x);

    // Deriving latitude is a bit harder: we can't directly project the vertex onto the camera's meridian — that would shrink its distance from the spin axis and inflate the angle.
    // Instead we can rotate the vertex (by -deltaLongitude) onto the camera's meridional plane. (Note: (unlike the exact longitude case) this is only first-order accurate because the meridian is an ellipse rather than a circle)
    // Using a 2D rotation formula introduces precision issues (subtraction of large-magnitude quantities), so instead we can calculate the vector difference
    // between the vertex and its rotated version, and apply it to the cameraToVertex vector. Then, the cameraToVertex vector accurately
    // reflects the difference between the camera and the _rotated_ vertex, so we can then project the camera onto the meridional plane and apply this offset -- as we derived deltaLongitude above.
    // Best of all, we can do this all with small delta quantities to preserve precision.
    //
    // (I suggest drawing this out -- as the vertex and camera vectors projected onto the equatorial plane, with the camera on the +x axis)
    // Mathematically: if you compare (subtract) vertexEquatorialPos and the same vector rotated onto the camera's meridional plane, you get
    // |dx| = |vertexEquatorialPos| - vertexEquatorialPos.x = (r - x) = r * (1 - cos(deltaLongitude))
    // |dy| = cameraToVertex.x (the east component)
    // (To avoid precision issues, use the identity (1 - cos(x) = 2 * sin^2(x/2)))
    //
    // Since these offsets were produced in the equatorial plane, and cameraToVertex is in the camera's ENU frame, we need to deconstruct along the camera's north and up axes. And we only care about
    // dx, since dy is in the camera's east direction, and that component gets zeroed out when projecting onto the camera's meridional plane.
    float sinHalfLongitude = sin(deltaLongitude * 0.5);
    float dx = length(vertexEquatorialPos) * 2.0 * sinHalfLongitude * sinHalfLongitude;
    vec3 meridionalOffset = vec3(
        0.0,                                 // east
        cameraToVertex.y - dx * sinLatitude, // north
        cameraToVertex.z + dx * cosLatitude  // up
    );

    // Reframe the camera in a meridional plane, where it lies along the +z axis, and apply the meridionalOffset to get the vertex's position in that plane.
    // Then, deltaLatitude is simply the atan of its x and y components.
    float meridionalRadius = 1.0 / czm_eyeEllipsoidCurvature.y;
    vec2 cameraMeridionalPos = vec2(meridionalRadius + czm_eyeCartographic.z, 0.0);
    vec2 vertMeridionalPos = cameraMeridionalPos + vec2(meridionalOffset.z, meridionalOffset.y);
    float deltaLatitude = atan(vertMeridionalPos.y, vertMeridionalPos.x);

    // Finally, express the vertex's position within the model's rectangle as a normalized uv coordinate, by adding the camera's uv and scaling by the rectangle's size.
    // Since the camera's UV is computed on the CPU in double precision, and gets more precise as one zooms in, this ensures good precision on the vertex's uv.
    v_clippingUv = u_clippingCameraUv + vec2(deltaLongitude, deltaLatitude) * u_clippingRectangleInverseSize;
}
