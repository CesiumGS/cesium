uniform sampler2D colorTexture;
uniform sampler2D dirtTexture;
uniform sampler2D starTexture;
uniform vec2 dirtTextureDimensions;
uniform float distortion;
uniform float ghostDispersal;
uniform float haloWidth;
uniform float dirtAmount;
uniform float earthRadius;
uniform float intensity;

in vec2 v_textureCoordinates;

// whether it is in space or not
// 6500000.0 is empirical value
#define DISTANCE_TO_SPACE 6500000.0

// return ndc from world coordinate biased earthRadius
vec4 getNDCFromWC(vec3 WC, float earthRadius)
{
    vec4 positionEC = czm_view * vec4(WC, 1.0);
    positionEC = vec4(positionEC.x + earthRadius, positionEC.y, positionEC.z, 1.0);
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    return czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
}

// Check if current pixel is included Earth
// if then mask it gradually
float isInEarth(vec2 texcoord, vec2 sceneSize)
{
    vec2 NDC = texcoord * 2.0 - 1.0;
    vec4 earthPosSC = getNDCFromWC(vec3(0.0), 0.0);
    vec4 earthPosSCEdge = getNDCFromWC(vec3(0.0), earthRadius * 1.5);
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
        color.r = isInEarth(texcoord + direction * distortion.r, sceneSize) * texture(tex, texcoord + direction * distortion.r).r;
        color.g = isInEarth(texcoord + direction * distortion.g, sceneSize) * texture(tex, texcoord + direction * distortion.g).g;
        color.b = isInEarth(texcoord + direction * distortion.b, sceneSize) * texture(tex, texcoord + direction * distortion.b).b;
    }
    else
    {
        color.r = texture(tex, texcoord + direction * distortion.r).r;
        color.g = texture(tex, texcoord + direction * distortion.g).g;
        color.b = texture(tex, texcoord + direction * distortion.b).b;
    }
    return vec4(clamp(color, 0.0, 1.0), 0.0);
}

void main(void)
{
    vec4 originalColor = texture(colorTexture, v_textureCoordinates);
    vec3 rgb = originalColor.rgb;
    bool isSpace = length(czm_viewerPositionWC.xyz) > DISTANCE_TO_SPACE;

    // Sun position
    vec4 sunPos = czm_morphTime == 1.0 ? vec4(czm_sunPositionWC, 1.0) : vec4(czm_sunPositionColumbusView.zxy, 1.0);
    vec4 sunPositionEC = czm_view * sunPos;
    vec4 sunPositionWC = czm_eyeToWindowCoordinates(sunPositionEC);
    sunPos = czm_viewportOrthographic * vec4(sunPositionWC.xy, -sunPositionWC.z, 1.0);

    // If sun is not in the screen space, use original color.
    if(!isSpace || !((sunPos.x >= -1.1 && sunPos.x <= 1.1) && (sunPos.y >= -1.1 && sunPos.y <= 1.1)))
    {
        // Lens flare is disabled when not in space until #5932 is fixed.
        //    https://github.com/CesiumGS/cesium/issues/5932
        out_FragColor = originalColor;
        return;
    }

    vec2 texcoord = vec2(1.0) - v_textureCoordinates;
    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;
    vec2 invPixelSize = 1.0 / pixelSize;
    vec3 distortionVec = pixelSize.x * vec3(-distortion, 0.0, distortion);

    // ghost vector to image centre:
    vec2 ghostVec = (vec2(0.5) - texcoord) * ghostDispersal;
    vec3 direction = normalize(vec3(ghostVec, 0.0));

    // sample ghosts:
    vec4 result = vec4(0.0);
    vec4 ghost = vec4(0.0);
    for (int i = 0; i < 4; ++i)
    {
        vec2 offset = fract(texcoord + ghostVec * float(i));
        // Only bright spots from the centre of the source image
        ghost += textureDistorted(colorTexture, offset, direction.xy, distortionVec, isSpace);
    }
    result += ghost;

    // sample halo
    vec2 haloVec = normalize(ghostVec) * haloWidth;
    float weightForHalo = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));
    weightForHalo = pow(1.0 - weightForHalo, 5.0);

    result += textureDistorted(colorTexture, texcoord + haloVec, direction.xy, distortionVec, isSpace) * weightForHalo * 1.5;

    // dirt on lens
    vec2 dirtTexCoords = (v_textureCoordinates * invPixelSize) / dirtTextureDimensions;
    if (dirtTexCoords.x > 1.0)
    {
        dirtTexCoords.x = mod(floor(dirtTexCoords.x), 2.0) == 1.0 ? 1.0 - fract(dirtTexCoords.x) :  fract(dirtTexCoords.x);
    }
    if (dirtTexCoords.y > 1.0)
    {
        dirtTexCoords.y = mod(floor(dirtTexCoords.y), 2.0) == 1.0 ? 1.0 - fract(dirtTexCoords.y) :  fract(dirtTexCoords.y);
    }
    result += dirtAmount * texture(dirtTexture, dirtTexCoords);

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
        result *= oneMinusWeightForLensFlare * intensity * 0.2;
    }
    else
    {
        result *= oneMinusWeightForLensFlare * intensity;
        result *= texture(starTexture, lensStarTexcoord) * pow(weightForLensFlare, 1.0) * max((1.0 - length(vec3(st1.xy, 0.0))), 0.0) * 2.0;
    }

    result += texture(colorTexture, v_textureCoordinates);

    out_FragColor = result;
}
