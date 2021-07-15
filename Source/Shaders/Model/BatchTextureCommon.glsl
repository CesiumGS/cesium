// GLSL batchId is zero-based: [0, featuresLength - 1]
#ifdef MULTILINE_BATCH_TEXTURE
vec2 computeSt(float batchId) 
{ 
    float stepX = model_textureStep.x; 
    float centerX = model_textureStep.y; 
    float stepY = model_textureStep.z; 
    float centerY = model_textureStep.w; 
    float xId = mod(batchId, model_textureDimensions.x); 
    float yId = floor(batchId / model_textureDimensions.x);
    return vec2(centerX + (xId * stepX), centerY + (yId * stepY));
}
#else
vec2 computeSt(float batchId)
{
    float stepX = model_textureStep.x;
    float centerX = model_textureStep.y;
    return vec2(centerX + (batchId * stepX), 0.5);
}
#endif