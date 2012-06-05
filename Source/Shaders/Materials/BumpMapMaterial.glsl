uniform sampler2D u_texture;
uniform vec2 u_repeat;

//x,y,z : normal in eye space
vec3 agi_getMaterialNormalComponent(MaterialHelperInput helperInput)
{
    vec2 st = helperInput.st;
    
    vec2 centerPixel = fract(u_repeat * st);
    float centerBump = texture2D(u_texture, centerPixel).x;
    
    float windowWidth = float(agi_viewport.z);
    vec2 rightPixel = fract(u_repeat * (st + vec2(1.0 / windowWidth, 0.0)));
    float rightBump = texture2D(u_texture, rightPixel).x;
    
    float windowHeight = float(agi_viewport.w);
    vec2 leftPixel = fract(u_repeat * (st + vec2(0.0, 1.0 / windowHeight)));
    float topBump = texture2D(u_texture, leftPixel).x;
    
    vec3 normalTangentSpace = normalize(vec3(centerBump - rightBump, centerBump - topBump, 1.0));
    vec3 normalEC = helperInput.tangentToEyeMatrix * normalTangentSpace;
    return normalEC;
}
