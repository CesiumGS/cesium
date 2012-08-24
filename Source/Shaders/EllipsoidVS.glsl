attribute vec3 position2D;
attribute vec3 position3D;

uniform float u_morphTime;

varying vec3 v_positionEC;

void main() 
{
    vec4 p = czm_columbusViewMorph(position2D, position3D, u_morphTime);
    
    // v_positionEC = (czm_modelView * vec4(position3D, 1.0)).xyz;     // position in eye coordinates
    v_positionEC = (czm_modelView * p).xyz;
    gl_Position = czm_modelViewProjection * p;                      // position in clip coordinates
}
