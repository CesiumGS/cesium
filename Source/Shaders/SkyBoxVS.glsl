attribute vec4 position;

varying vec3 v_texCoord;

void main()
{
    vec3 p = czm_viewRotation * (czm_model * (czm_entireFrustum.y * position)).xyz;
    gl_Position = czm_projection * vec4(p, 1.0);
    v_texCoord = position.xyz;
}
