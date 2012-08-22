attribute vec3 position;

uniform vec3 u_center;
uniform float u_morphTime;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_centerEC;

void main() 
{
    // vec4 p = agi_columbusViewMorph(vec3(0.0, 0.0, 0.0), position, u_morphTime);
    v_centerEC = (agi_modelView * vec4(u_center, 1.0)).xyz;
    
    v_positionMC = position;                                      // position in model coordinates
    v_positionEC = (agi_modelView * vec4(position, 1.0)).xyz;     // position in eye coordinates
    gl_Position = agi_modelViewProjection * vec4(position, 1.0);  // position in clip coordinates
}
