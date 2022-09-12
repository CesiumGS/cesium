uniform vec3 u_noiseTextureDimensions;
attribute vec2 position;

varying vec2 v_position;

void main()
{
    gl_Position = vec4(position, 0.1, 1.0);

    float textureSliceWidth = u_noiseTextureDimensions.x;
    float noiseTextureRows = u_noiseTextureDimensions.y;
    float inverseNoiseTextureRows = u_noiseTextureDimensions.z;
    vec2 transformedPos = (position * 0.5) + vec2(0.5);
    transformedPos *= textureSliceWidth;
    transformedPos.x *= textureSliceWidth * inverseNoiseTextureRows;
    transformedPos.y *= noiseTextureRows;
    v_position = transformedPos;
}
