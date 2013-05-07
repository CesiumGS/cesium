attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec2 position2DHigh;
attribute vec2 position2DLow;
attribute vec2 textureCoordinates;

uniform float u_height;     // in meters

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_textureCoordinates;

void main() 
{
    vec4 p;

    if (czm_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
    }
    else if (czm_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(vec3(u_height, position2DHigh), vec3(u_height, position2DLow)), 1.0);
    }
    else
    {
	    p = czm_columbusViewMorph(
	        czm_translateRelativeToEye(vec3(u_height, position2DHigh), vec3(u_height, position2DLow)),
	        czm_translateRelativeToEye(position3DHigh, position3DLow), 
	        czm_morphTime);
    }

    v_positionMC = position3DHigh + position3DLow;           // position in model coordinates
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;     // position in eye coordinates
    v_textureCoordinates = textureCoordinates;
    gl_Position = czm_modelViewProjectionRelativeToEye * p;  // position in clip coordinates
}
