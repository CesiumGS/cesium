uniform vec4 u_lightWoodColor;
uniform vec4 u_darkWoodColor;
uniform float u_ringFrequency;
uniform float u_lightGrains;
uniform float u_darkGrains;
uniform float u_grainThreshold;
uniform vec2 u_noiseScale;
uniform float u_noisiness;
uniform float u_grainFrequency;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    //Base on wood shader from OpenGL Shading Language (3rd edition) pg. 455
    
    vec2 noisevec;
    noisevec.x = agi_snoise(st * u_noiseScale.x);
    noisevec.y = agi_snoise(st * u_noiseScale.y);
    noisevec *= u_noisiness;
    
    vec2 location = st + noisevec;
    float dist = sqrt(location.x * location.x + location.y * location.y);
    dist *= u_ringFrequency;
    
    float r = fract(dist + noisevec[0] + noisevec[1]) * 2.0;
    if(r > 1.0)
        r = 2.0 - r;
        
    vec4 color = mix(u_lightWoodColor, u_darkWoodColor, r);
    
    //streaks
    r = abs(agi_snoise(vec2(st.x * u_grainFrequency, st.y * u_grainFrequency * 0.02))) * 0.2;
    color += u_lightWoodColor * r;

    color.w = 1.0;
    return color;
}