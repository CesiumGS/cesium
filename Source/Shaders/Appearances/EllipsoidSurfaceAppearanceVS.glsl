attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec2 st;

varying vec3 v_positionMC;
varying vec3 v_positionEC;
varying vec2 v_st;

void main() 
{
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);   

    v_positionMC = positionHigh + positionLow;               // position in model coordinates
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;     // position in eye coordinates
    v_st = st;
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
