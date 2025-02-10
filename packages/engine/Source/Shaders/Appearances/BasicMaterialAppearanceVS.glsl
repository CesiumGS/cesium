in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 normal;
in float batchId;

out vec3 v_positionEC;
out vec3 v_normalEC;

void main()
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
