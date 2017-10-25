uniform sampler2D u_colorTexture;
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;
uniform float u_focalDistance;

varying vec2 v_textureCoordinates;

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
    if (depth < u_focalDistance)
    {
        f = (u_focalDistance - depth) / (u_focalDistance - czm_currentFrustum.x);
    }
    else
    {
        f = (depth - u_focalDistance) / (czm_currentFrustum.y - u_focalDistance);
        f = pow(f, 0.1);
    }
    f *= f;
    f = clamp(f, 0.0, 1.0);
    return pow(f, 0.5);
}

void main(void)
{
    float depth = texture2D(u_depthTexture, v_textureCoordinates).r;
    vec4 posInCamera = toEye(v_textureCoordinates, depth);
    float d = computeDepthBlur(-posInCamera.z);
    gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), texture2D(u_texture, v_textureCoordinates), d);
}
