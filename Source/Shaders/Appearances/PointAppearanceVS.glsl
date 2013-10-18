attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;

varying vec3 v_positionEC;
varying vec4 v_color;

void main() 
{
    v_color = color;
    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();
    gl_PointSize = 2.0;
}
