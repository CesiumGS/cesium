attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 color;
attribute float batchId;

uniform float pointSize;

varying vec3 v_positionEC;
varying vec3 v_color;

void main() 
{
    v_color = color;
    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();
    gl_PointSize = pointSize;
}
