attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;

varying vec4 v_color;

void main() 
{
    vec4 p = czm_translateRelativeToEye(position3DHigh, position3DLow);

    v_color = color;
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
