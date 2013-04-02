attribute vec3 position;

uniform vec3 u_radii;

varying vec3 v_positionEC;

void main() 
{
    // In the vertex data, the cube goes from (-1.0, -1.0, -1.0) to (1.0, 1.0, 1.0) in model coordinates.
    // Scale to consider the radii.  We could also do this once on the CPU when using the BoxTessellator,
    // but doing it here allows us to change the radii without rewriting the vertex data, and
    // allows all ellipsoids to reuse the same vertex data.
    vec4 p = vec4(u_radii * position, 1.0);

    v_positionEC = (czm_modelView * p).xyz;     // position in eye coordinates
    gl_Position = czm_modelViewProjection * p;  // position in clip coordinates

    // With multi-frustum, when the ellipsoid primitive is positioned on the intersection of two frustums 
    // and close to terrain, the terrain (writes depth) in the closest frustum can overwrite part of the 
    // ellipsoid (does not write depth) that was rendered in the farther frustum.
    //
    // Here, we clamp the depth in the vertex shader to avoid being overwritten; however, this creates
    // artifacts since some fragments can be alpha blended twice.  This is solved by only rendering
    // the ellipsoid in the closest frustum to the viewer.
    gl_Position.z = clamp(gl_Position.z, gl_DepthRange.near, gl_DepthRange.far);
}
