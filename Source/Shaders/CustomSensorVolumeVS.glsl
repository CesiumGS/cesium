attribute vec4 position;
attribute vec3 normal;

varying vec3 v_positionWC;
varying vec3 v_positionEC;
varying vec3 v_normalEC;
varying vec3 v_sensorVertexWC;
varying vec3 v_sensorVertexEC;

void main()
{
    gl_Position = agi_modelViewProjection * position;
    v_positionWC = (agi_model * position).xyz;
    v_positionEC = (agi_modelView * position).xyz;
    v_normalEC = agi_normal * normal;
    
    // This transform could be done once on the CPU.
    // We could also hand-optimize the zeros out if the compiler doesn't already.
    vec4 sensorVertexMC = vec4(0.0, 0.0, 0.0, 1.0);
    v_sensorVertexWC = (agi_model * sensorVertexMC).xyz;
    v_sensorVertexEC = (agi_modelView * sensorVertexMC).xyz;
}