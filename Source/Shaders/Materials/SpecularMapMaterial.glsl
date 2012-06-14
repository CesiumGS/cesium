uniform sampler2D u_texture;
uniform vec2 u_repeat;

float agi_getMaterialSpecularComponent(MaterialHelperInput helperInput)
{
    return texture2D(u_texture, fract(u_repeat * helperInput.st)).x;
}
