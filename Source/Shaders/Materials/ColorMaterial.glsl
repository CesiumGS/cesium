uniform vec4 u_color;

// x,y,z : diffuse color
// w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    return u_color;
}