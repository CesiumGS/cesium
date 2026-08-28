/**
 * Computes the geodetic offset (delta longitude, latitude, and height) from a reference cartographic position
 * to a point given in eye coordinates.
 *
 * This is designed to preserve precision. Rather than converting the point's absolute world position to
 * cartographic -- which is too large to process precisely at 32 bits -- it works entirely with the small
 * delta between the point and the camera. By projecting the eye-space offset onto the ellipsoid's equatorial
 * and meridional planes, it derives the change in (longitude, latitude, height) as small, precisely-representable
 * quantities. The delta gets smaller and more precise as one zooms in.
 * <br /><br />
 * This assumes an ellipsoid of revolution (equatorial radii equal, as with WGS84), so that longitude is exact.
 * The latitude calculation is only first-order accurate, since the meridian is an ellipse rather than a circle.
 *
 * @name czm_eyeToCartographicDelta
 * @glslFunction
 *
 * @param {vec3} positionEC The position, in eye coordinates, to measure to.
 *
 * @returns {vec3} The geodetic offset from the camera to <code>positionEC</code>, as (delta longitude, delta latitude in radians, delta height in meters).
 */
vec3 czm_eyeToCartographicDelta(vec3 positionEC)
{
    // A vector representing the camera-to-vertex offset, in an ENU oriented reference frame (centered at the camera)
    vec3 cameraToVertex = czm_eyeToEnu * positionEC;

    float cosLatitude = cos(czm_eyeCartographic.y);
    float sinLatitude = sin(czm_eyeCartographic.y);

    // To derive longitude, project the camera and vertex onto the equatorial plane, in a frame such that the camera lies along the +x axis. In this frame,
    // the vertex's (delta) longitude is simply the atan of its x and y components.
    float primeVerticalRadius = 1.0 / czm_eyeEllipsoidCurvature.x;
    vec2 cameraEquatorialPos = vec2((primeVerticalRadius + czm_eyeCartographic.z) * cosLatitude, 0.0);
    vec2 vertexEquatorialPos = cameraEquatorialPos + vec2(-cameraToVertex.y * sinLatitude + cameraToVertex.z * cosLatitude, cameraToVertex.x);
    float deltaLongitude = atan(vertexEquatorialPos.y, vertexEquatorialPos.x);

    // Deriving latitude is a bit harder: we can't directly project the vertex onto the camera's meridian — the latitude projection is dependent on the longitude.
    // Instead we can rotate the vertex (by -deltaLongitude) onto the camera's meridional plane.  (Note: (unlike the exact longitude case) this is only first-order accurate because the meridian is an ellipse rather than a circle)
    // Using a 2D rotation formula introduces precision issues (subtraction of large-magnitude quantities), so instead we can calculate the vector difference
    // between the vertex and its rotated version, and apply that offset to the cameraToVertex vector. Then, the cameraToVertex vector accurately
    // reflects the difference between the camera and the _rotated_ vertex, so we can then project the camera onto the meridional plane and apply this offset - just as we did for deltaLongitude, above.
    // Best of all, we can do this all with small delta quantities which preserve precision.
    //
    // (I suggest drawing this out -- with the vertex and camera vectors projected onto the equatorial plane, with the camera on the +x axis)
    // Mathematically: if you compare (subtract) vertexEquatorialPos and the same vector rotated onto the camera's meridional plane, you get
    // |dx| = |vertexEquatorialPos| - vertexEquatorialPos.x = (r - x) = r * (1 - cos(deltaLongitude))
    // |dy| = cameraToVertex.x (the east component)
    // (To avoid precision issues, we'll use the identity (1 - cos(x) = 2 * sin^2(x/2)))
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

    // Finally, derive the change in height above the ellipsoid. This is the meridional-plane analogue of the dx step above:
    // there we rotated the vertex (in the equatorial plane) to the camera's longitude; here we rotate it (in the meridional plane, by -deltaLatitude)
    // to the camera's latitude, aligning it with the camera's radial (up) direction.
    float sinHalfLatitude = sin(deltaLatitude * 0.5);
    float dz = length(vertMeridionalPos) * 2.0 * sinHalfLatitude * sinHalfLatitude;
    float deltaHeight = meridionalOffset.z + dz;

    return vec3(deltaLongitude, deltaLatitude, deltaHeight);
}
