uniform sampler2D u_colorTexture;
uniform sampler2D u_dirtTexture;
uniform sampler2D u_starTexture;
uniform float u_distortion;
uniform float u_ghostDispersal;
uniform float u_haloWidth;
uniform float u_earthRadius;
uniform float u_intensity;

varying vec2 v_textureCoordinates;

// whether it is in space or not
// 6500000.0 is Emprical value
#define DISTANCE_TO_SPACE 6500000.0

// return ndc from world coordinate biased earthRadius
vec4 getNDCFromWC(vec3 WC, float earthRadius)
{
    vec4 positionEC = czm_view * vec4(WC, 1.0);
    positionEC = vec4(positionEC.x + earthRadius , positionEC.y, positionEC.z, 1.0);
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    return czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
}

// Check if current pixel is included Earth
// if then mask it gradually
float isInEarth(vec2 texcoord, vec2 sceneSize)
{
    vec2 NDC = texcoord * 2.0 - 1.0;
    vec4 earthPosSC = getNDCFromWC(vec3(0.0), 0.0);
    vec4 earthPosSCEdge = getNDCFromWC(vec3(0.0), u_earthRadius * 1.5);
    NDC.xy -= earthPosSC.xy;

    float X = abs(NDC.x) * sceneSize.x;
    float Y = abs(NDC.y) * sceneSize.y;

    return clamp(0.0, 1.0, max(sqrt(X * X + Y * Y) / max(abs(earthPosSCEdge.x * sceneSize.x), 1.0) - 0.8 , 0.0));
}

// For Chromatic effect
vec4 textureDistorted(sampler2D tex, vec2 texcoord, vec2 direction, vec3 distortion, bool isSpace)
{
    vec2 sceneSize = czm_viewport.zw;
    vec3 color;
    if(isSpace)
    {
        color.r = isInEarth(texcoord + direction * distortion.r, sceneSize) * texture2D(tex, texcoord + direction * distortion.r).r;
        color.g = isInEarth(texcoord + direction * distortion.g, sceneSize) * texture2D(tex, texcoord + direction * distortion.g).g;
        color.b = isInEarth(texcoord  + direction * distortion.b, sceneSize) * texture2D(tex, texcoord + direction * distortion.b).b;
    }
    else
    {
        color.r = texture2D(tex, texcoord + direction * distortion.r).r;
        color.g = texture2D(tex, texcoord + direction * distortion.g).g;
        color.b = texture2D(tex, texcoord + direction * distortion.b).b;
    }
    return vec4(clamp(color, 0.0, 1.0), 0.0);
}

void main(void)
{
    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb;
    bool isSpace = length(czm_viewerPositionWC.xyz) > DISTANCE_TO_SPACE;

    // Sun position
    vec4 sunPos = czm_morphTime == 1.0 ? vec4(czm_sunPositionWC, 1.0) : vec4(czm_sunPositionColumbusView.zxy, 1.0);
    vec4 sunPositionEC = czm_view * sunPos;
    vec4 sunPositionWC = czm_eyeToWindowCoordinates(sunPositionEC);
    sunPos = czm_viewportOrthographic * vec4(sunPositionWC.xy, -sunPositionWC.z, 1.0);

    vec2 texcoord = -v_textureCoordinates + vec2(1.0);
    vec2 texelSize = 1.0 / czm_viewport.zw;
    vec3 distortion = vec3(-texelSize.x * u_distortion, 0.0, texelSize.x * u_distortion);

    // ghost vector to image centre:
    vec2 ghostVec = (vec2(0.5) - texcoord) * u_ghostDispersal;
    vec3 direction = normalize(vec3(ghostVec, 0.0));

    // sample ghosts:
    vec4 result = vec4(0.0);
    vec4 ghost = vec4(0.0);
    for (int i = 0; i < 4; ++i)
    {
        vec2 offset = fract(texcoord + ghostVec * float(i));
        // Only bright spots from the centre of the source image
        ghost += textureDistorted(u_colorTexture, offset, direction.xy, distortion, isSpace);
    }
    result += ghost;

    // sample halo
    vec2 haloVec = normalize(ghostVec) * u_haloWidth;
    float weightForHalo = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));
    weightForHalo = pow(1.0 - weightForHalo, 5.0);

    result += textureDistorted(u_colorTexture, texcoord + haloVec, direction.xy, distortion, isSpace) * weightForHalo * 1.5;
    result += texture2D(u_dirtTexture, v_textureCoordinates);

    // Rotating starburst texture's coordinate
    // dot(czm_view[0].xyz, vec3(0.0, 0.0, 1.0)) + dot(czm_view[1].xyz, vec3(0.0, 1.0, 0.0))
    float camrot = czm_view[0].z + czm_view[1].y;
    float cosValue = cos(camrot);
    float sinValue = sin(camrot);
    mat3 rotation = mat3(
        cosValue, -sinValue, 0.0,
        sinValue, cosValue, 0.0,
        0.0, 0.0, 1.0
    );

    vec3 st1 = vec3(v_textureCoordinates * 2.0 - vec2(1.0), 1.0);
    vec3 st2 = vec3((rotation * st1).xy, 1.0);
    vec3 st3 = st2 * 0.5 + vec3(0.5);
    vec2 lensStarTexcoord = st3.xy;
    float weightForLensFlare = length(vec3(sunPos.xy, 0.0));
    float oneMinusWeightForLensFlare = max(1.0 - weightForLensFlare, 0.0);

    if (!isSpace)
    {
        result *= oneMinusWeightForLensFlare * u_intensity * 0.2;
    }
    else
    {
        result *= oneMinusWeightForLensFlare * u_intensity;
        result *= texture2D(u_starTexture, lensStarTexcoord) * pow(weightForLensFlare, 1.0) * max((1.0 - length(vec3(st1.xy, 0.0))), 0.0) * 2.0;
    }

    // If sun is in the screen space, add lens flare effect
    if( (sunPos.x >= -1.1 && sunPos.x <= 1.1) && (sunPos.y >= -1.1 && sunPos.y <= 1.1))
    {
        result += texture2D(u_colorTexture, v_textureCoordinates);
    }
    else
    {
        result = texture2D(u_colorTexture, v_textureCoordinates);
    }

    gl_FragColor = result;
}
