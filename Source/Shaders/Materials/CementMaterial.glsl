uniform vec4 u_cementColor;
uniform float u_grainScale;
uniform float u_roughness;

// x,y,z : diffuse color
// w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    float noise = agi_snoise(helperInput.st / u_grainScale);
    noise = pow(noise, 5.0) * u_roughness;
   
    vec4 color = u_cementColor + noise;
    
    color.w = 1.0;
    return color;
}