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
}
