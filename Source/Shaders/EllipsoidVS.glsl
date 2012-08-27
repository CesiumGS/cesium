attribute vec3 position2D;
attribute vec3 position3D;

uniform vec3 u_radii;
uniform float u_morphTime;

varying vec3 v_positionEC;

void main() 
{
   // In the vertex data, the cube goes from (-1.0, -1.0, -1.0) to (1.0, 1.0, 1.0) in model coordinates.
   // Scale to consider the radii.  We could also do this once on the CPU when using the BoxTessellator,
   // but doing it here allows us to change the radii without rewriting the vertex data, and
   // allows all ellipsoids to reuse the same vertex data.
    vec4 p = czm_columbusViewMorph(u_radii.yzx * position2D, u_radii * position3D, u_morphTime);
    
    v_positionEC = (czm_modelView * p).xyz;     // position in eye coordinates
    gl_Position = czm_modelViewProjection * p;  // position in clip coordinates
}
