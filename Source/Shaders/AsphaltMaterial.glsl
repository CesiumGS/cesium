uniform vec4 u_asphaltColor;
uniform float u_bumpSize;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    vec2 F = agi_cellular(st / u_bumpSize);
    vec4 color = u_asphaltColor;
    //color.xyz += (F.y - F.x) * 0.1;
    color.xyz -= (F.x / F.y) * 0.1;
    
    //color changes
    vec2 scaled1 = st / 0.4;
    vec2 scaled2 = st / 0.2;
    vec2 scaled3 = st / 0.1;
    float noise = agi_snoise(scaled1) + agi_snoise(scaled2) * 0.5 + agi_snoise(scaled3);
    noise = 0.00005 / sin(abs(noise * (1.0 / u_bumpSize) * 0.001));
    color.xyz -= noise;
    
    //cracks
    
    
    return color;
}
