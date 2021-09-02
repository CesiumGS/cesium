uniform float u_noiseTextureLength;
attribute vec2 position;

varying vec2 v_position;

void main()
{
    gl_Position = vec4(position, 0.1, 1.0);

    vec2 transformedPos = (position / 2.0) + vec2(0.5);
    transformedPos *= u_noiseTextureLength;
    transformedPos.x *= u_noiseTextureLength;
    v_position = transformedPos;
}
