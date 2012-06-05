uniform sampler2D u_texture;
uniform vec2 u_repeat;

// x,y,z : diffuse color
// w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    return texture2D(u_texture, fract(u_repeat * helperInput.st));
}