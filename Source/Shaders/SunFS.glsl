varying vec2 v_textureCoordinates;
varying float v_radiusTS;           // The radius in texture space

const float glowLengthTS = 0.3;

vec2 rotate(vec2 p, vec2 direction)
{
    return vec2(p.x*direction.x - p.y*direction.y, p.x*direction.y + p.y*direction.x);
}

vec4 addBurst(vec2 position, vec2 direction)
{
    vec2 rotatedPosition = rotate(position, direction) * vec2(25.0, 0.75);
    float radius = length(rotatedPosition);
    float burst = 1.0 - smoothstep(0.0, glowLengthTS + v_radiusTS, radius);

    return vec4(burst);
}

void main()
{
    vec2 position = v_textureCoordinates - vec2(0.5);
    float radius = length(position);
    float surface = step(radius, v_radiusTS);
    vec4 color = vec4(1.0, 1.0, surface + 0.2, surface);

    float glow = 1.0 - smoothstep(0.0, glowLengthTS + v_radiusTS, radius);
    color.ba += mix(vec2(0.0), vec2(1.0), glow) * 0.75;

    for (float i = 0.4; i < 3.2; i += 1.047) {
        vec2 direction = vec2(sin(i), cos(i));
        color += 0.4 * addBurst(position, direction);

        direction = vec2(sin(i - 0.08), cos(i - 0.08));
        color += 0.3 * addBurst(position, direction);
    }

    color = clamp(color, vec4(0.0), vec4(1.0));

    gl_FragColor = color;
}
