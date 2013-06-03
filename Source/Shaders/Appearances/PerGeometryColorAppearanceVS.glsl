attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec3 normal;
attribute vec4 color;
attribute vec4 pickColor;

varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec4 v_color;
varying vec4 czm_pickColor;

void main() 
{
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);   

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    v_color = color;
    czm_pickColor = pickColor;
    
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
