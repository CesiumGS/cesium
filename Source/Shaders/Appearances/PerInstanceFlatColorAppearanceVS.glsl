attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;
attribute float batchId;

varying vec4 v_color;

void main()
{
    vec4 p = czm_computePosition();

    v_color = color;

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
