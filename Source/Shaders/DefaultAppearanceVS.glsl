attribute vec4 position;
attribute vec3 normal;

varying vec3 v_normalEC;
varying vec3 v_positionEC;

void main() 
{
    v_normalEC = czm_normal * normal;                   // normal in eye coordinates
    v_positionEC = (czm_modelView * position).xyz;      // position in eye coordinates
    
    gl_Position = czm_modelViewProjection * position;
}
