in vec3 positionHigh;
in vec3 positionLow;
in vec2 texCoord;

out vec2 v_uv;

void main()
{
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();
    v_uv = texCoord;
}
