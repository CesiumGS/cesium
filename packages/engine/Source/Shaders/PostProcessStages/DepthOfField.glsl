uniform sampler2D colorTexture;
uniform sampler2D blurTexture;
uniform sampler2D depthTexture;
uniform float focalDistance;

in vec2 v_textureCoordinates;

vec4 toEye(vec2 uv, float depth)
{
   vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));
   vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);
   posInCamera = posInCamera / posInCamera.w;
   return posInCamera;
}

float computeDepthBlur(float depth)
{
    float f;
    if (depth < focalDistance)
    {
        f = (focalDistance - depth) / (focalDistance - czm_currentFrustum.x);
    }
    else
    {
        f = (depth - focalDistance) / (czm_currentFrustum.y - focalDistance);
        f = pow(f, 0.1);
    }
    f *= f;
    f = clamp(f, 0.0, 1.0);
    return pow(f, 0.5);
}

void main(void)
{
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    vec4 posInCamera = toEye(v_textureCoordinates, depth);
    float d = computeDepthBlur(-posInCamera.z);
    out_FragColor = mix(texture(colorTexture, v_textureCoordinates), texture(blurTexture, v_textureCoordinates), d);
}
