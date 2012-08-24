attribute vec3 position2D;
attribute vec3 position3D;

uniform vec3 u_center;
uniform float u_morphTime;

varying vec3 v_positionEC;
varying vec3 v_centerEC;

void main() 
{
    vec4 p = czm_columbusViewMorph(position2D, position3D, u_morphTime);
    
    // This could be computed once on the CPU, but there are only 8 vertices
    v_centerEC = (czm_view * vec4(u_center, 1.0)).xyz;
    
    // v_positionEC = (czm_modelView * vec4(position3D, 1.0)).xyz;     // position in eye coordinates
    v_positionEC = (czm_modelView * p).xyz;
    gl_Position = czm_modelViewProjection * p;                      // position in clip coordinates
}
