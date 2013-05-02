varying vec2 v_textureCoordinates;

void main()
{
    #define DIRECTIONS_SIZE 4
    vec2 rayDirections[DIRECTIONS_SIZE];
    rayDirections[0] = vec2(1.0, 0.0);
    rayDirections[1] = vec2(0.0, 1.0);
    rayDirections[2] = vec2(0.5, 0.8660254037844386);
    rayDirections[3] = vec2(-0.5, 0.8660254037844386);
    
    vec4 color = vec4(1.0, 1.0, 0.0, 1.0);
    vec2 st = v_textureCoordinates;
    
    float b = smoothstep(0.04, 0.4, length(v_textureCoordinates - vec2(0.5)));
    color.ba = mix(vec2(1.0), vec2(0.0), b);
    
    float distFromCenter = length((st * 2.0) - 1.0);
    float verticalColor = mix(1.0, 0.0, distFromCenter);
    
    float width = mix(0.02, 0.0, distFromCenter);
    
    for (int i = 0; i < DIRECTIONS_SIZE; i++)
    {
        vec2 direction = rayDirections[i];
        float distToLine = length(((vec2(0.5) - st) - (dot(vec2(0.5) - st, direction) * direction)));
        float horizontalColor = clamp(width - distToLine, 0.0, width) / width;
        color.ba += verticalColor * horizontalColor;
    }
    
    gl_FragColor = color;
}
