attribute vec4 position;
attribute vec3 normal;

varying vec3 v_positionWC;
varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec3 v_sensorVertexWC;
varying vec3 v_sensorVertexEC;

void main()
{
    gl_Position = czm_modelViewProjection * position;
    v_positionWC = (czm_model * position).xyz;
    v_positionEC = (czm_modelView * position).xyz;
    v_normalEC = czm_normal * normal;
    
    // This transform could be done once on the CPU.
    // We could also hand-optimize the zeros out if the compiler doesn't already.
    vec4 sensorVertexMC = vec4(0.0, 0.0, 0.0, 1.0);
    v_sensorVertexWC = (czm_model * sensorVertexMC).xyz;
    v_sensorVertexEC = (czm_modelView * sensorVertexMC).xyz;
}