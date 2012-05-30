uniform sampler2D u_texture;
uniform vec2 u_repeat;

//x,y,z : normal in tangent space
vec3 agi_getMaterialNormal(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec3(0.0, 0.0, 1.0); //unperturbed normal
}

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    float alpha = texture2D(u_texture, fract(u_repeat * st)).x;
    return vec4(0.0, 0.0, 0.0, alpha); //alpha on black
}

//x,y,z : specular color
//    w : specular intensity
vec4 agi_getMaterialSpecularComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec4(0.0, 0.0, 0.0, 0.0); //no specular
}
