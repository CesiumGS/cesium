//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec3 u_noiseTextureDimensions;\n\
attribute vec2 position;\n\
\n\
varying vec2 v_position;\n\
\n\
void main()\n\
{\n\
    gl_Position = vec4(position, 0.1, 1.0);\n\
\n\
    float textureSliceWidth = u_noiseTextureDimensions.x;\n\
    float noiseTextureRows = u_noiseTextureDimensions.y;\n\
    float inverseNoiseTextureRows = u_noiseTextureDimensions.z;\n\
    vec2 transformedPos = (position * 0.5) + vec2(0.5);\n\
    transformedPos *= textureSliceWidth;\n\
    transformedPos.x *= textureSliceWidth * inverseNoiseTextureRows;\n\
    transformedPos.y *= noiseTextureRows;\n\
    v_position = transformedPos;\n\
}\n\
";
