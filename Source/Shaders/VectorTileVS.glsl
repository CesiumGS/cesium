attribute vec3 position;
attribute float a_batchId;

uniform mat4 u_modifiedModelViewProjection;

void main()
{
    gl_Position = czm_depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));
}
