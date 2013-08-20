varying vec2 v_textureCoordinates;
varying float v_radiusTS;           // The radius in texture space

const float glowLengthTS = 0.1;

void main()
{
    float radius = length(v_textureCoordinates - vec2(0.5));
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * step(radius, v_radiusTS);
    
    vec4 color = vec4(1.0, 1.0, 0.0, 1.0);
    float b = 1.0 - smoothstep(0.0, glowLengthTS + v_radiusTS, radius);
    color.ba = mix(vec2(0.0), vec2(1.0), b);
    
    gl_FragColor += color;
}
