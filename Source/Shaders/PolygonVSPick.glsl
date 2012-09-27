attribute vec2 position2D;
attribute vec3 position3D;

uniform float u_morphTime;
uniform float u_height;     // in meters

void main() 
{
    vec4 p = czm_columbusViewMorph(vec3(u_height, position2D), position3D, u_morphTime);

    gl_Position = czm_modelViewProjection * p;                      // position in clip coordinates
}
