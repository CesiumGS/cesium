varying vec2 v_textureCoordinates;

void main()
{
    #define DIRECTIONS_SIZE 10
    vec2 rayDirections[DIRECTIONS_SIZE];
    for (int i = 0; i < DIRECTIONS_SIZE; i++)
    {
        float angle = czm_pi * float(i) / float(DIRECTIONS_SIZE);
        rayDirections[i] = vec2(cos(angle), sin(angle));
    }
    
    vec4 color = vec4(1.0, 1.0, 0.0, 1.0);
    vec2 st = v_textureCoordinates;
    
    float b = smoothstep(0.03, 0.3, length(v_textureCoordinates - vec2(0.5)));
    color.ba = mix(vec2(1.0), vec2(0.0), b);
    
    float distFromCenter = length((st * 2.0) - 1.0);
    float width = mix(0.015, 0.0, distFromCenter);
    
    for (int i = 0; i < DIRECTIONS_SIZE; i++)
    {
        float verticalColor = mix(mod(float(i), 2.0) + 0.5, 0.0, distFromCenter);
        vec2 direction = rayDirections[i];
        float distToLine = length(((vec2(0.5) - st) - (dot(vec2(0.5) - st, direction) * direction)));
        float horizontalColor = clamp(width - distToLine, 0.0, width) / width;
        color.ba += verticalColor * horizontalColor;
    }
    
    gl_FragColor = color;
}
