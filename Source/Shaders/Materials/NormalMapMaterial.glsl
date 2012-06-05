uniform sampler2D u_texture;
uniform vec2 u_repeat;

//x,y,z : normal in eye space
vec3 agi_getMaterialNormalComponent(MaterialHelperInput helperInput)
{
    vec3 normalTangentSpace = texture2D(u_texture, fract(u_repeat * helperInput.st)).xyz;
    normalTangentSpace.xy = normalTangentSpace.xy * 2.0 - 1.0;
    normalTangentSpace = normalize(normalTangentSpace);
    
    vec3 normalEC = helperInput.tangentToEyeMatrix * normalTangentSpace;
    
    return normalEC;
}
