attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec3 binormal;
attribute vec2 st;
attribute vec4 pickColor;

varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec3 v_tangentEC;
varying vec3 v_binormalEC;
varying vec2 v_st;
varying vec4 czm_pickColor;

void main() 
{
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);   

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    v_tangentEC = czm_normal * tangent;                       // tangent in eye coordinates
    v_binormalEC = czm_normal * binormal;                     // binormal in eye coordinates
    v_st = st;
    czm_pickColor = pickColor;
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
