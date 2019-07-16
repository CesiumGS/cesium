uniform float u_glowLengthTS;
uniform float u_radiusTS;

varying vec2 v_textureCoordinates;

vec2 rotate(vec2 p, vec2 direction)
{
    return vec2(p.x * direction.x - p.y * direction.y, p.x * direction.y + p.y * direction.x);
}

vec4 addBurst(vec2 position, vec2 direction)
{
    vec2 rotatedPosition = rotate(position, direction) * vec2(25.0, 0.75);
    float radius = length(rotatedPosition);
    float burst = 1.0 - smoothstep(0.0, 0.55, radius);

    return vec4(burst);
}

void main()
{
    vec2 position = v_textureCoordinates - vec2(0.5);
    float radius = length(position);
    float surface = step(radius, u_radiusTS);
    vec4 color = vec4(1.0, 1.0, surface + 0.2, surface);

    float glow = 1.0 - smoothstep(0.0, 0.55, radius);
    color.ba += mix(vec2(0.0), vec2(1.0), glow) * 0.75;

    vec4 burst = vec4(0.0);

    // The following loop has been manually unrolled for speed, to
    // avoid sin() and cos().
    //
    //for (float i = 0.4; i < 3.2; i += 1.047) {
    //    vec2 direction = vec2(sin(i), cos(i));
    //    burst += 0.4 * addBurst(position, direction);
    //
    //    direction = vec2(sin(i - 0.08), cos(i - 0.08));
    //    burst += 0.3 * addBurst(position, direction);
    //}

    burst += 0.4 * addBurst(position, vec2(0.38942,  0.92106));  // angle == 0.4
    burst += 0.4 * addBurst(position, vec2(0.99235,  0.12348));  // angle == 0.4 + 1.047
    burst += 0.4 * addBurst(position, vec2(0.60327, -0.79754));  // angle == 0.4 + 1.047 * 2.0

    burst += 0.3 * addBurst(position, vec2(0.31457,  0.94924));  // angle == 0.4 - 0.08
    burst += 0.3 * addBurst(position, vec2(0.97931,  0.20239));  // angle == 0.4 + 1.047 - 0.08
    burst += 0.3 * addBurst(position, vec2(0.66507, -0.74678));  // angle == 0.4 + 1.047 * 2.0 - 0.08

    // End of manual loop unrolling.

    color += clamp(burst, vec4(0.0), vec4(1.0)) * 0.15;
    
    gl_FragColor = clamp(color, vec4(0.0), vec4(1.0));
}
