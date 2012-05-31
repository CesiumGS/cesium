uniform sampler2D u_texture;
uniform vec2 u_repeat;

//x,y,z : normal in tangent space
vec3 agi_getMaterialNormal(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    vec2 centerPixel = fract(u_repeat * st);
    float centerBump = texture2D(u_texture, centerPixel).x;
    
    float windowWidth = float(agi_viewport.z);
    vec2 rightPixel = fract(u_repeat * (st + vec2(1.0 / windowWidth, 0.0)));
    float rightBump = texture2D(u_texture, rightPixel).x;
    
    float windowHeight = float(agi_viewport.w);
    vec2 leftPixel = fract(u_repeat * (st + vec2(0.0, 1.0 / windowHeight)));
    float topBump = texture2D(u_texture, leftPixel).x;
    
    return normalize(vec3(centerBump - rightBump, centerBump - topBump, 1.0));
}

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec4(0.0, 0.0, 0.0, 1.0); //black
}

//x,y,z : specular color
//    w : specular intensity
vec4 agi_getMaterialSpecularComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec4(1.0, 1.0, 1.0, 1.0);
}
