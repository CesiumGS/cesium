attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec2 direction;                       // in screen space
attribute vec4 textureCoordinatesAndImageSize;  // size in normalized texture coordinates
attribute vec3 originAndShow;                   // show is 0.0 (false) or 1.0 (true)
attribute vec4 pixelOffsetAndTranslate;         // x,y, translateX, translateY
attribute vec4 eyeOffsetAndScale;               // eye offset in meters
attribute vec4 rotationAndAlignedAxis;
attribute vec4 scaleByDistance;                 // near, nearScale, far, farScale
attribute vec4 translucencyByDistance;          // near, nearTrans, far, farTrans
attribute vec4 pixelOffsetScaleByDistance;      // near, nearScale, far, farScale

#ifdef RENDER_FOR_PICK
attribute vec4 pickColor;
#else
attribute vec4 color;
#endif

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
    vec3 eyeOffset = eyeOffsetAndScale.xyz;
    float scale = eyeOffsetAndScale.w;
    vec2 textureCoordinates = textureCoordinatesAndImageSize.xy;
    vec2 imageSize = textureCoordinatesAndImageSize.zw;
    vec2 origin = originAndShow.xy;
    float show = originAndShow.z;
    vec2 pixelOffset = pixelOffsetAndTranslate.xy;
    vec2 translate = pixelOffsetAndTranslate.zw;
    
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
    
#ifdef ROTATION
    float rotation = rotationAndAlignedAxis.x;
    vec3 alignedAxis = rotationAndAlignedAxis.yzw;
    
    if (!all(equal(rotationAndAlignedAxis, vec4(0.0))))
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
