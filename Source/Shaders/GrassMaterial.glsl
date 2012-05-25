uniform vec4 u_grassColor;
uniform vec4 u_dirtColor;
uniform float u_patchiness;

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    float noise1 = (agi_snoise(st * u_patchiness * 1.0)) * 1.0;
    float noise2 = (agi_snoise(st * u_patchiness * 2.0)) * 0.5;
    float noise3 = (agi_snoise(st * u_patchiness * 4.0)) * 0.25;
    float noise = sin(noise1 + noise2 + noise3) * 0.1;
    
    vec4 color = mix(u_grassColor, u_dirtColor, noise);
    
    //Make thatch patterns
    float verticalNoise = agi_snoise(vec2(st.x * 100.0, st.y * 20.0)) * 0.02;
    float horizontalNoise = agi_snoise(vec2(st.x * 20.0, st.y * 100.0)) * 0.02;
    float stripeNoise = min(verticalNoise, horizontalNoise);
 
    color += stripeNoise;
    
    color.w = 1.0;
    return color;
}