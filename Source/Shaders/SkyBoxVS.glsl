attribute vec4 position;

varying vec3 texCoord;

void main()
{
    vec3 p = czm_viewRotation * (czm_model * position).xyz;
    gl_Position = czm_projection * vec4(p, 1.0);
    texCoord = position.xyz;
}
