#ifdef VERTEX_TEXTURE_FETCH_SUPPORTED

varying vec2 model_featureSt;
varying vec4 model_featureColor;
uniform sampler2D model_batchTexture;

vec4 pickingStage(vec4 color)
{
  return model_featureColor;
}

#endif
