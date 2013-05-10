attribute vec4 position;
//attribute vec3 normal;
//attribute vec2 st;
attribute vec4 pickColor;

//varying vec3 v_normalEC;
//varying vec3 v_positionEC;
//varying vec2 v_st;
varying vec4 czm_pickColor;

void main() 
{
//    v_normalEC = czm_normal * normal;                   // normal in eye coordinates
//    v_positionEC = (czm_modelView * position).xyz;      // position in eye coordinates
//    v_st = st;
    czm_pickColor = pickColor;
    
    gl_Position = czm_modelViewProjection * position;
}
