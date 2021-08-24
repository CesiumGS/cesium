#ifdef MULTILINE_BATCH_TEXTURE

uniform vec4 u_textureStep; 
uniform vec2 u_textureDimensions;

vec2 computeSt(float featureId) 
{ 
    float stepX = u_textureStep.x; 
    float centerX = u_textureStep.y; 
    float stepY = u_textureStep.z; 
    float centerY = u_textureStep.w; 
    float xId = mod(featureId, u_textureDimensions.x); 
    float yId = floor(featureId / u_textureDimensions.x);
    return vec2(centerX + (xId * stepX), centerY + (yId * stepY));
}

#else

uniform vec4 u_textureStep;
vec2 computeSt(float featureId)
{
    float stepX = u_textureStep.x;
    float centerX = u_textureStep.y;
    return vec2(centerX + (featureId * stepX), 0.5);
}

#endif
