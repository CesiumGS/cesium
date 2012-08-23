attribute vec4 position;

varying vec3 v_positionEC;
varying vec3 v_sensorVertexWC;
varying vec3 v_sensorVertexEC;
varying vec3 v_sensorAxisEC;

void main()
{
    gl_Position = czm_modelViewInfiniteProjection * position;
    v_positionEC = (czm_modelView * position).xyz;
    
    // These transforms could be done once on the CPU, but there are only five vertices.
    // We could also hand-optimize the zeros out if the compiler doesn't already.
    vec4 sensorVertexMC = vec4(0.0, 0.0, 0.0, 1.0);
    v_sensorVertexWC = (czm_model * sensorVertexMC).xyz;
    v_sensorVertexEC = (czm_modelView * sensorVertexMC).xyz;
    v_sensorAxisEC = czm_normal * vec3(0.0, 0.0, 1.0);
}