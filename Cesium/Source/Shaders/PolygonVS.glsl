attribute vec2 position2D;
attribute vec3 position3D;
attribute vec2 textureCoordinates;

uniform float u_morphTime;
uniform float u_height;     // in meters

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

void main() 
{
    vec4 p = agi_columbusViewMorph(vec3(u_height, position2D), position3D, u_morphTime);

    v_positionMC = position3D;                                      // position in model coordinates
    v_positionEC = (agi_modelView * vec4(position3D, 1.0)).xyz;     // position in eye coordinates
    v_textureCoordinates = textureCoordinates;
    gl_Position = agi_modelViewProjection * p;                      // position in clip coordinates
}
