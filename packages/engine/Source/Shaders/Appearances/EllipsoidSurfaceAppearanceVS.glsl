in vec3 position3DHigh;
in vec3 position3DLow;
in vec2 st;
in float batchId;

out vec3 v_positionMC;
out vec3 v_positionEC;
out vec2 v_st;

void main()
{
    vec4 p = czm_computePosition();

    v_positionMC = position3DHigh + position3DLow;           // position in model coordinates
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;     // position in eye coordinates
    v_st = st;

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
