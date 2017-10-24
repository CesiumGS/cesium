#extension GL_OES_standard_derivatives : enable

uniform sampler2D u_colorTexture;
uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

vec4 clipToEye(vec2 uv, float depth)
{
    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);
    posEC = posEC / posEC.w;
    return posEC;
}

// Reconstruct normal from view position
vec3 getNormal(vec3 posInCamera)
{
    vec3 d1 = dFdx(posInCamera);
    vec3 d2 = dFdy(posInCamera);
    return normalize(cross(d2, d1));
}

float linearDepth(float depth)
{
    float far = czm_currentFrustum.y;
    float near = czm_currentFrustum.x;
    return (2.0 * near) / (far + near - depth * (far - near));
}

void main(void)
{
    float depth = texture2D(u_depthTexture, v_textureCoordinates).r;
    vec4 posInCamera = clipToEye(v_textureCoordinates, depth);
    vec3 normalInCamera = getNormal(posInCamera.xyz);
    vec4 normalInWorld = czm_inverseView * vec4(normalInCamera, 0.0);
    depth = linearDepth(depth);
    gl_FragColor = vec4(depth);
}
