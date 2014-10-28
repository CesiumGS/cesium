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

float getNearFarScalar(vec4 nearFarScalar, float cameraDistSq)
{
    float valueAtMin = nearFarScalar.y;
    float valueAtMax = nearFarScalar.w;
    float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;
    float farDistanceSq = nearFarScalar.z * nearFarScalar.z;

    float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);

    t = pow(clamp(t, 0.0, 1.0), 0.2);

    return mix(valueAtMin, valueAtMax, t);
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
#endif

    float upperBound = pow(2.0, 15.0);
    float compressed = compressedAttribute0.x;
    
    vec2 pixelOffset;
    pixelOffset.x = floor(compressed / pow(2.0, 7.0));
    compressed -= pixelOffset.x * pow(2.0, 7.0);
    pixelOffset.x -= upperBound;
    
    vec2 origin;
    origin.x = floor(compressed / pow(2.0, 5.0));
    compressed -= origin.x * pow(2.0, 5.0);
    
    origin.y = floor(compressed / pow(2.0, 3.0));
    compressed -= origin.y * pow(2.0, 3.0);
    
    origin -= vec2(1.0);
    
    float show = floor(compressed / pow(2.0, 2.0));
    compressed -= show * pow(2.0, 2.0);
    
    vec2 direction;
    direction.x = floor(compressed / 2.0);
    direction.y = compressed - direction.x * 2.0;
    
    float temp = compressedAttribute0.y / pow(2.0, 8.0);
    pixelOffset.y = floor(temp) - upperBound;
    
    vec2 translate;
    translate.y = (temp - floor(temp)) * pow(2.0, 16.0);
    
    temp = compressedAttribute0.z / pow(2.0, 8.0);
    translate.x = floor(temp) - upperBound;
    
    translate.y += (temp - floor(temp)) * pow(2.0, 8.0);
    translate.y -= upperBound;
    
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressedAttribute0.w);
    
    temp = compressedAttribute1.x / pow(2.0, 8.0);
    
    vec2 imageSize = vec2(floor(temp), compressedAttribute2.w);
    
#ifdef EYE_DISTANCE_TRANSLUCENCY
    vec4 translucencyByDistance;
    translucencyByDistance.x = compressedAttribute1.z;
    translucencyByDistance.z = compressedAttribute1.w;
    
    translucencyByDistance.y = ((temp - floor(temp)) * pow(2.0, 8.0)) / 255.0;
    
    temp = compressedAttribute1.y / pow(2.0, 8.0);
    translucencyByDistance.w = ((temp - floor(temp)) * pow(2.0, 8.0)) / 255.0;
#endif

#ifdef ALIGNED_AXIS
    vec3 alignedAxis = czm_octDecode(floor(temp));
#else
    vec3 alignedAxis = vec3(0.0);
#endif
    
    vec4 color;
    temp = compressedAttribute2.x / pow(2.0, 8.0);
    color.b = (temp - floor(temp)) * pow(2.0, 8.0);
    temp = floor(temp) / pow(2.0, 8.0);
    color.g = (temp - floor(temp)) * pow(2.0, 8.0);
    color.r = floor(temp);
    
    vec4 pickColor;
    temp = compressedAttribute2.y / pow(2.0, 8.0);
    pickColor.b = (temp - floor(temp)) * pow(2.0, 8.0);
    temp = floor(temp) / pow(2.0, 8.0);
    pickColor.g = (temp - floor(temp)) * pow(2.0, 8.0);
    pickColor.r = floor(temp);
    
    temp = compressedAttribute2.z / pow(2.0, 8.0);
    pickColor.a = (temp - floor(temp)) * pow(2.0, 8.0);
    color.a = floor(temp);
    
    color /= 255.0;
    pickColor /= 255.0;
    
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
    scale *= getNearFarScalar(scaleByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (scale == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

    float translucency = 1.0;
#ifdef EYE_DISTANCE_TRANSLUCENCY
    translucency = getNearFarScalar(translucencyByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (translucency == 0.0)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

#ifdef EYE_DISTANCE_PIXEL_OFFSET
    float pixelOffsetScale = getNearFarScalar(pixelOffsetScaleByDistance, lengthSq);
    pixelOffset *= pixelOffsetScale;
#endif

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

    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    v_textureCoordinates = textureCoordinates;

#ifdef RENDER_FOR_PICK
    v_pickColor = pickColor;
#else
    v_color = color;
    v_color.a *= translucency;
#endif
}
