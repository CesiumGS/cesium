in vec3 position;
in float a_batchId;

uniform mat4 u_modifiedModelViewProjection;

void main()
{
    gl_Position = czm_depthClamp(u_modifiedModelViewProjection * vec4(position, 1.0));
}
