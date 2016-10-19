attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 normal;
attribute float batchId;

varying vec3 v_positionEC;
varying vec3 v_normalEC;

void main() 
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
