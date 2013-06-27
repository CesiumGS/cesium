attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec3 binormal;
attribute vec2 st;

varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec3 v_tangentEC;
varying vec3 v_binormalEC;
varying vec2 v_st;

void main() 
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    v_tangentEC = czm_normal * tangent;                       // tangent in eye coordinates
    v_binormalEC = czm_normal * binormal;                     // binormal in eye coordinates
    v_st = st;
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
