attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 color;
attribute float show;

varying vec4 v_color;

uniform float u_morphTime;

void main() 
{
    vec4 p;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
    }
    else
    {
        p = czm_columbusViewMorph(
        	czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
            czm_translateRelativeToEye(position3DHigh, position3DLow), 
            u_morphTime);
    }

    gl_Position = czm_modelViewProjectionRelativeToEye * p * show;  // position in clip coordinates
    v_color = color;
}
