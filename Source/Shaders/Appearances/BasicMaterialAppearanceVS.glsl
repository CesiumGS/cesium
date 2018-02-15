attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 normal;
attribute float batchId;

varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying float v_inverse_depth;

void main()
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
    v_inverse_depth = 1.0 / gl_Position.w;
}
