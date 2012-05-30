uniform vec4 u_asphaltColor;
uniform float u_bumpSize;
uniform float u_roughness;

//x,y,z : normal in tangent space
vec3 agi_getMaterialNormal(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec3(0.0, 0.0, 1.0);
    
    //This code assumes the window is windowWidth x windowHeight
    //Need to find a reliable way of getting the pixel size
    //float centerBump = texture2D(u_bumpMap, st).x;
    //float rightBump =  texture2D(u_bumpMap, st + vec2(1/windowWidth,0)).x;
    //float topBump =    texture2D(u_bumpMap, st + vec2(0,1/windowHeight)).x;
    //return normalize(vec3(centerBump - rightBump, centerBump - topBump, 1.0));
}

//x,y,z : diffuse color
//    w : alpha
vec4 agi_getMaterialDiffuseComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights
    
    //Main cellular pattern
    /*
    vec2 F = agi_cellular(st / u_bumpSize);
    vec4 color = u_asphaltColor;
    color -= (F.x / F.y) * 0.1;
    
    //Extra bumps for roughness
    float noise = agi_snoise(st / u_bumpSize);
    noise = pow(noise, 5.0) * u_roughness;
    color += noise;

    color.w = 1.0;
    return color;
    */
    return vec4(0.7,0.2,0.2,1.0);
}

//x,y,z : specular color
//    w : specular intensity
vec4 agi_getMaterialSpecularComponent(float zDistance, vec2 st, vec3 str, vec3 viewWC)
{
    return vec4(1.0, 1.0, 1.0, 1.0);
}
