uniform mat3 u_temeToFixedRotation;

in vec3 position;
out vec3 v_texCoord;

void main()
{
    vec3 p = czm_viewRotation * (u_temeToFixedRotation * (czm_entireFrustum.y * position));
    gl_Position = czm_projection * vec4(p, 1.0);
    v_texCoord = position.xyz;
}
