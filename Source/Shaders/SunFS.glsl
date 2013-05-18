varying vec2 v_textureCoordinates;

void main()
{
    vec4 color = vec4(1.0, 1.0, 0.0, 1.0);
    
    float b = smoothstep(0.03, 0.3, length(v_textureCoordinates - vec2(0.5)));
    color.ba = mix(vec2(1.0), vec2(0.0), b);
    
    gl_FragColor = color;
}
