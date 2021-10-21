uniform float u_textureSliceWidth;
attribute vec2 position;

varying vec2 v_position;

void main()
{
    gl_Position = vec4(position, 0.1, 1.0);

    vec2 transformedPos = (position * 0.5) + vec2(0.5);
    transformedPos *= u_textureSliceWidth;
    transformedPos.x *= u_textureSliceWidth * 0.25;
    transformedPos.y *= 4.0;
    v_position = transformedPos;
}
