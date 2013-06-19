attribute vec3 positionHigh;
attribute vec3 positionLow;
attribute vec2 direction;                       // in screen space
attribute vec4 textureCoordinatesAndImageSize;  // size in normalized texture coordinates
attribute vec3 originAndShow;                   // show is 0.0 (false) or 1.0 (true)
attribute vec2 pixelOffset;
attribute vec4 eyeOffsetAndScale;               // eye offset in meters
attribute vec4 rotationAndAlignedAxis;

#ifdef RENDER_FOR_PICK
attribute vec4 pickColor;
#else
attribute vec4 color;
#endif

const vec2 czm_highResolutionSnapScale = vec2(1.0, 1.0);    // TODO

varying vec2 v_textureCoordinates;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#else
varying vec4 v_color;
#endif

void main() 
{
    // Modifying this shader may also require modifications to Billboard.computeScreenSpacePosition
    
    // unpack attributes
    vec3 eyeOffset = eyeOffsetAndScale.xyz;
    float scale = eyeOffsetAndScale.w;
    vec2 textureCoordinates = textureCoordinatesAndImageSize.xy;
    vec2 imageSize = textureCoordinatesAndImageSize.zw;
    vec2 origin = originAndShow.xy;
    float show = originAndShow.z;
    
    ///////////////////////////////////////////////////////////////////////////
    
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    positionEC = czm_eyeOffset(positionEC, eyeOffset);
    positionEC.xyz *= show;
    
    ///////////////////////////////////////////////////////////////////////////     
    
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    
    vec2 halfSize = imageSize * scale * czm_highResolutionSnapScale;
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
    positionWC.xy += (pixelOffset * czm_highResolutionSnapScale);

    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    v_textureCoordinates = textureCoordinates;

#ifdef RENDER_FOR_PICK
    v_pickColor = pickColor;
#else
    v_color = color;
#endif
}
