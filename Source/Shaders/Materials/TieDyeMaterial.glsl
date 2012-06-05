uniform vec4 u_lightColor;
uniform vec4 u_darkColor;
uniform float u_frequency;

// x,y,z : diffuse color
// w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    vec3 scaled = helperInput.str * u_frequency;
    float t = abs(agi_snoise(scaled));
    
    return mix(u_lightColor, u_darkColor, t);
}
