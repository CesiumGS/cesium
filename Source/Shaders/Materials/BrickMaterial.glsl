uniform vec4 u_brickColor;
uniform vec4 u_mortarColor;
uniform vec2 u_brickSize;
uniform vec2 u_brickPct;
uniform float u_brickRoughness;
uniform float u_mortarRoughness;

#define Integral(x, p) ((floor(x) * p) + max(fract(x) - (1.0 - p), 0.0))

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

    // From OpenGL Shading Language (3rd edition) pg. 194, 501
    vec2 st = materialInput.st;
    
    vec2 position = st / u_brickSize;
    if(fract(position.y * 0.5) > 0.5)
        position.x += 0.5;    
        
    //calculate whether to use brick or mortar (does AA)
    vec2 filterWidth = vec2(0.02);
    vec2 useBrick = (Integral(position + filterWidth, u_brickPct) - 
                       Integral(position, u_brickPct)) / filterWidth;
    float useBrickFinal = useBrick.x * useBrick.y;
    vec4 color = mix(u_mortarColor, u_brickColor, useBrickFinal);
    
    //Apply noise to brick
    vec2 brickScaled = vec2(st.x / 0.1, st.y / 0.006);
    float brickNoise = abs(agi_snoise(brickScaled) * u_brickRoughness / 5.0);
    color.rg += brickNoise * useBrickFinal;
    
    //Apply noise to mortar
    vec2 mortarScaled = st / 0.005;
    float mortarNoise = max(agi_snoise(mortarScaled) * u_mortarRoughness, 0.0);
    color.rgb += mortarNoise * (1.0 - useBrickFinal); 

    material.diffuseComponent = color.rgb;
    
    return material;
}