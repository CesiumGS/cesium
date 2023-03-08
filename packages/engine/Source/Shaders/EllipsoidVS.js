//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec3 position;\n\
\n\
uniform vec3 u_radii;\n\
\n\
varying vec3 v_positionEC;\n\
\n\
void main()\n\
{\n\
    // In the vertex data, the cube goes from (-1.0, -1.0, -1.0) to (1.0, 1.0, 1.0) in model coordinates.\n\
    // Scale to consider the radii.  We could also do this once on the CPU when using the BoxGeometry,\n\
    // but doing it here allows us to change the radii without rewriting the vertex data, and\n\
    // allows all ellipsoids to reuse the same vertex data.\n\
    vec4 p = vec4(u_radii * position, 1.0);\n\
\n\
    v_positionEC = (czm_modelView * p).xyz;     // position in eye coordinates\n\
    gl_Position = czm_modelViewProjection * p;  // position in clip coordinates\n\
\n\
    // With multi-frustum, when the ellipsoid primitive is positioned on the intersection of two frustums\n\
    // and close to terrain, the terrain (writes depth) in the closest frustum can overwrite part of the\n\
    // ellipsoid (does not write depth) that was rendered in the farther frustum.\n\
    //\n\
    // Here, we clamp the depth in the vertex shader to avoid being overwritten; however, this creates\n\
    // artifacts since some fragments can be alpha blended twice.  This is solved by only rendering\n\
    // the ellipsoid in the closest frustum to the viewer.\n\
    gl_Position.z = clamp(gl_Position.z, czm_depthRange.near, czm_depthRange.far);\n\
\n\
    czm_vertexLogDepth();\n\
}\n\
";
