// The editor grid's vertex shader. Scales and offsets a unit square in the
// grid's plane to the area around the camera that the grid covers.

in vec2 position;

// The camera's position in the grid's plane, in meters.
uniform vec2 u_cameraPosition;
// The distance from the camera at which the grid has faded out, and half the
// width of the area it covers, in meters.
uniform float u_extent;

out vec2 v_positionPlane;

void main()
{
    v_positionPlane = u_cameraPosition + position * u_extent;
    gl_Position = czm_modelViewProjection * vec4(v_positionPlane, 0.0, 1.0);
}
