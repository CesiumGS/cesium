uniform vec4 brickColor;
uniform vec4 mortarColor;
uniform vec2 brickSize;
uniform vec2 brickPct;
uniform float brickRoughness;
uniform float mortarRoughness;

#define Integral(x, p) ((floor(x) * p) + max(fract(x) - (1.0 - p), 0.0))

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // From OpenGL Shading Language (3rd edition) pg. 194, 501
    vec2 st = materialInput.st;
    vec2 position = st / brickSize;
    if(fract(position.y * 0.5) > 0.5) {
        position.x += 0.5;    
    }
        
    //calculate whether to use brick or mortar (does AA)
    vec2 filterWidth = vec2(0.02);
    vec2 useBrick = (Integral(position + filterWidth, brickPct) - 
                       Integral(position, brickPct)) / filterWidth;
    float useBrickFinal = useBrick.x * useBrick.y;
    vec4 color = mix(mortarColor, brickColor, useBrickFinal);
    
    //Apply noise to brick
    vec2 brickScaled = vec2(st.x / 0.1, st.y / 0.006);
    float brickNoise = abs(czm_snoise(brickScaled) * brickRoughness / 5.0);
    color.rg += brickNoise * useBrickFinal;
    
    //Apply noise to mortar
    vec2 mortarScaled = st / 0.005;
    float mortarNoise = max(czm_snoise(mortarScaled) * mortarRoughness, 0.0);
    color.rgb += mortarNoise * (1.0 - useBrickFinal); 

    material.diffuse = color.rgb;
    material.alpha = color.a;
    
    return material;
}