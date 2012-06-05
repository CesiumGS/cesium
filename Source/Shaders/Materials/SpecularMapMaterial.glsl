uniform sampler2D u_texture;
uniform bool u_useSpecularColor;
uniform vec2 u_repeat;

// x,y,z : specular color
// w : specular intensity
vec4 agi_getMaterialSpecularComponent(MaterialHelperInput helperInput)
{
    vec4 specularComponent = texture2D(u_texture, fract(u_repeat * helperInput.st));
    vec3 specularColor = specularComponent.xyz;
    float specularIntensity = specularComponent.w;
    
    if(u_useSpecularColor == false)
    {
        specularColor = vec3(1.0, 1.0, 1.0);
        specularIntensity = specularComponent.x;
    }
    
    return vec4(specularColor, specularIntensity);
}
