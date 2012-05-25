uniform vec4 u_asphaltColor;
uniform float u_bumpSize;
uniform float u_roughness;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    
    //Main cellular pattern
    vec2 F = agi_cellular(st / u_bumpSize);
    vec4 color = u_asphaltColor;
    color -= (F.x / F.y) * 0.1;
    
    //Extra bumps for roughness
    float noise = agi_snoise(st / u_bumpSize);
    noise = pow(noise, 5.0) * u_roughness;
    color += noise;

    color.w = 1.0;
    return color;
}
