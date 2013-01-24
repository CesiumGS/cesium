attribute vec4 position;
attribute vec3 normal;

varying vec3 v_positionWC;
varying vec3 v_positionEC;
varying vec3 v_normalEC;

void main()
{
    gl_Position = czm_modelViewProjection * position;
    v_positionWC = (czm_model * position).xyz;
    v_positionEC = (czm_modelView * position).xyz;
    v_normalEC = czm_normal * normal;
}