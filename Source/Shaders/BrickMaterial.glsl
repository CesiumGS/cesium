uniform vec4 u_brickColor;
uniform vec4 u_mortarColor;
uniform vec2 u_brickSize;
uniform vec2 u_brickPct;

#extension GL_OES_standard_derivatives : enable

#define Integral(x, p) ((floor(x) * p) + max(fract(x) - (1.0 - p), 0.0))

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    // From OpenGL Shading Language (3rd edition) pg. 194, 501
    
    vec2 position = st / u_brickSize;
    if(fract(position.y * 0.5) > 0.5)
        position.x += 0.5;    
        
    //bend the edges of the brick
    float shiftNoise = agi_snoise(st / 0.2) * 0.01;
    position += shiftNoise;
    
    //calculate whether to use brick or mortar (does AA)
    vec2 filterWidth = fwidth(position);
    vec2 useBrick = (Integral(position + filterWidth, u_brickPct) - 
                     Integral(position, u_brickPct)) / filterWidth;
    float useBrickFinal = useBrick.x * useBrick.y;
    vec4 color = mix(u_mortarColor, u_brickColor, useBrickFinal);
    
    //Apply noise to brick
    vec2 brickScaled = vec2(st.x / 0.1, st.y / 0.006);
    float brickNoise = abs(agi_snoise(brickScaled) * 0.04);
    color.xy += brickNoise * useBrickFinal;
    
    //Apply noise to mortar
    vec2 mortarScaled = st / 0.005;
    float mortarNoise = max(agi_snoise(mortarScaled) * 0.1 - 0.01, 0.0);
    color.xyz += mortarNoise * (1.0 - useBrickFinal); 
    
    return color;
}