uniform sampler2D u_texture;
uniform vec2 u_repeat;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    return texture2D(u_texture, fract(u_repeat * st));
}