attribute vec3 position3DHigh;
attribute vec3 position3DLow;

varying vec3 v_positionEC;

void main() 
{
    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();
    gl_PointSize = 1.0;
}
