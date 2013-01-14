attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec2 position2DHigh;
attribute vec2 position2DLow;

uniform float u_morphTime;
uniform float u_height;     // in meters

void main() 
{
    vec4 p;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(vec3(u_height, position2DHigh), vec3(u_height, position2DLow)), 1.0);
    }
    else
    {
	    p = czm_columbusViewMorph(
	        czm_translateRelativeToEye(vec3(u_height, position2DHigh), vec3(u_height, position2DLow)),
	        czm_translateRelativeToEye(position3DHigh, position3DLow), 
	        u_morphTime);
    }

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
