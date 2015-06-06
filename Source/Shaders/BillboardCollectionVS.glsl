attribute vec4 positionHighAndScale;
attribute vec4 positionLowAndRotation;   
attribute vec4 compressedAttribute0;        // pixel offset, translate, horizontal origin, vertical origin, show, texture coordinates, direction
attribute vec4 compressedAttribute1;        // aligned axis, translucency by distance, image width
attribute vec4 compressedAttribute2;        // image height, color, pick color, 2 bytes free
attribute vec3 eyeOffset;                   // eye offset in meters
attribute vec4 scaleByDistance;             // near, nearScale, far, farScale
attribute vec4 pixelOffsetScaleByDistance;  // near, nearScale, far, farScale

varying vec2 v_textureCoordinates;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#else
varying vec4 v_color;
#endif

const float UPPER_BOUND = 32768.0;

const float SHIFT_LEFT16 = 65536.0;
const float SHIFT_LEFT8 = 256.0;
const float SHIFT_LEFT7 = 128.0;
const float SHIFT_LEFT5 = 32.0;
const float SHIFT_LEFT3 = 8.0;
const float SHIFT_LEFT2 = 4.0;
const float SHIFT_LEFT1 = 2.0;

const float SHIFT_RIGHT8 = 1.0 / 256.0;
const float SHIFT_RIGHT7 = 1.0 / 128.0;
const float SHIFT_RIGHT5 = 1.0 / 32.0;
const float SHIFT_RIGHT3 = 1.0 / 8.0;
const float SHIFT_RIGHT2 = 1.0 / 4.0;
const float SHIFT_RIGHT1 = 1.0 / 2.0;

vec4 computePositionWindowCoordinates(vec4 positionEC, vec2 imageSize, float scale, vec2 direction, vec2 origin, vec2 translate, vec2 pixelOffset, vec3 alignedAxis, float rotation)
{
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    
    vec2 halfSize = imageSize * scale * czm_resolutionScale;
    halfSize *= ((direction * 2.0) - 1.0);
    
    positionWC.xy += (origin * abs(halfSize));
    
#if defined(ROTATION) || defined(ALIGNED_AXIS)
    if (!all(equal(alignedAxis, vec3(0.0))) || rotation != 0.0)
    {
        float angle = rotation;
        if (!all(equal(alignedAxis, vec3(0.0))))
        {
            vec3 pos = positionEC.xyz + czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow;
            vec3 normal = normalize(cross(alignedAxis, pos));
            vec4 tangent = vec4(normalize(cross(pos, normal)), 0.0);
            tangent = czm_modelViewProjection * tangent;
            angle += sign(-tangent.x) * acos(tangent.y / length(tangent.xy));
        }
        
        float cosTheta = cos(angle);
        float sinTheta = sin(angle);
        mat2 rotationMatrix = mat2(cosTheta, sinTheta, -sinTheta, cosTheta);
        halfSize = rotationMatrix * halfSize;
    }
#endif
    
    positionWC.xy += halfSize;
    positionWC.xy += translate;
    positionWC.xy += (pixelOffset * czm_resolutionScale);
    
    return positionWC;
}

void main() 
{
    // Modifying this shader may also require modifications to Billboard._computeScreenSpacePosition
    
    // unpack attributes
    vec3 positionHigh = positionHighAndScale.xyz;
    vec3 positionLow = positionLowAndRotation.xyz;
    float scale = positionHighAndScale.w;
    
#if defined(ROTATION) || defined(ALIGNED_AXIS)
    float rotation = positionLowAndRotation.w;
#else
    float rotation = 0.0;
#endif

    float compressed = compressedAttribute0.x;
    
    vec2 pixelOffset;
    pixelOffset.x = floor(compressed * SHIFT_RIGHT7);
    compressed -= pixelOffset.x * SHIFT_LEFT7;
    pixelOffset.x -= UPPER_BOUND;
    
    vec2 origin;
    origin.x = floor(compressed * SHIFT_RIGHT5);
    compressed -= origin.x * SHIFT_LEFT5;
    
    origin.y = floor(compressed * SHIFT_RIGHT3);
    compressed -= origin.y * SHIFT_LEFT3;
    
    origin -= vec2(1.0);
    
    float show = floor(compressed * SHIFT_RIGHT2);
    compressed -= show * SHIFT_LEFT2;
    
    vec2 direction;
    direction.x = floor(compressed * SHIFT_RIGHT1);
    direction.y = compressed - direction.x * SHIFT_LEFT1;
    
    float temp = compressedAttribute0.y  * SHIFT_RIGHT8;
    pixelOffset.y = -(floor(temp) - UPPER_BOUND);
    
    vec2 translate;
    translate.y = (temp - floor(temp)) * SHIFT_LEFT16;
    
    temp = compressedAttribute0.z * SHIFT_RIGHT8;
    translate.x = floor(temp) - UPPER_BOUND;
    
    translate.y += (temp - floor(temp)) * SHIFT_LEFT8;
    translate.y -= UPPER_BOUND;
    
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressedAttribute0.w);
    
    temp = compressedAttribute1.x * SHIFT_RIGHT8;
    
    vec2 imageSize = vec2(floor(temp), compressedAttribute2.w);
    
#ifdef EYE_DISTANCE_TRANSLUCENCY
    vec4 translucencyByDistance;
    translucencyByDistance.x = compressedAttribute1.z;
    translucencyByDistance.z = compressedAttribute1.w;
    
    translucencyByDistance.y = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;
    
    temp = compressedAttribute1.y * SHIFT_RIGHT8;
    translucencyByDistance.w = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;
#endif

#ifdef ALIGNED_AXIS
    vec3 alignedAxis = czm_octDecode(floor(compressedAttribute1.y * SHIFT_RIGHT8));
#else
    vec3 alignedAxis = vec3(0.0);
#endif
    
#ifdef RENDER_FOR_PICK
    temp = compressedAttribute2.y;
#else
    temp = compressedAttribute2.x;
#endif

    vec4 color;
    temp = temp * SHIFT_RIGHT8;
    color.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    color.g = (temp - floor(temp)) * SHIFT_LEFT8;
    color.r = floor(temp);
    
    temp = compressedAttribute2.z * SHIFT_RIGHT8;
    
#ifdef RENDER_FOR_PICK
    color.a = (temp - floor(temp)) * SHIFT_LEFT8;
    vec4 pickColor = color / 255.0;
#else
    color.a = floor(temp);
    color /= 255.0;
#endif
    
    ///////////////////////////////////////////////////////////////////////////
    
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    positionEC = czm_eyeOffset(positionEC, eyeOffset);
    positionEC.xyz *= show;
    
    ///////////////////////////////////////////////////////////////////////////     

#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY) || defined(EYE_DISTANCE_PIXEL_OFFSET)
    float lengthSq;
    if (czm_sceneMode == czm_sceneMode2D)
    {
        // 2D camera distance is a special case
        // treat all billboards as flattened to the z=0.0 plane
        lengthSq = czm_eyeHeight2D.y;
    }
    else
    {
        lengthSq = dot(positionEC.xyz, positionEC.xyz);
    }
#endif

#ifdef EYE_DISTANCE_SCALING
    scale *= czm_nearFarScalar(scaleByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (scale == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

    float translucency = 1.0;
#ifdef EYE_DISTANCE_TRANSLUCENCY
    translucency = czm_nearFarScalar(translucencyByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (translucency == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

#ifdef EYE_DISTANCE_PIXEL_OFFSET
    float pixelOffsetScale = czm_nearFarScalar(pixelOffsetScaleByDistance, lengthSq);
    pixelOffset *= pixelOffsetScale;
#endif
    
#ifdef CLAMPED_TO_GROUND
    // move slightly closer to camera to avoid depth issues.
    positionEC.z *= 0.995;
    
    // Force bottom vertical origin
    origin.y = 1.0;
#endif

    vec4 positionWC = computePositionWindowCoordinates(positionEC, imageSize, scale, direction, origin, translate, pixelOffset, alignedAxis, rotation);
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    v_textureCoordinates = textureCoordinates;

#ifdef RENDER_FOR_PICK
    v_pickColor = pickColor;
#else
    v_color = color;
    v_color.a *= translucency;
#endif
}
