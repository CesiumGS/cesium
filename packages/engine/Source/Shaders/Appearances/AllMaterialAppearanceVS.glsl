in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 normal;
in vec3 tangent;
in vec3 bitangent;
in vec2 st;
in float batchId;

out vec3 v_positionEC;
out vec3 v_normalEC;
out vec3 v_tangentEC;
out vec3 v_bitangentEC;
out vec2 v_st;

void main()
{
    vec4 p = czm_computePosition();

    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates
    v_tangentEC = czm_normal * tangent;                       // tangent in eye coordinates
    v_bitangentEC = czm_normal * bitangent;                   // bitangent in eye coordinates
    v_st = st;

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
