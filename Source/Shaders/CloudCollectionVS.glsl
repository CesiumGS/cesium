#ifdef INSTANCED
attribute vec2 direction;
#endif
attribute vec4 positionHighAndScaleX;
attribute vec4 positionLowAndScaleY;
attribute vec4 compressedAttribute0;
attribute vec4 compressedAttribute1;

varying vec2 v_textureCoordinates;
varying vec3 v_cloudSize;
varying float v_cloudFlat; 

void main() {
    // Unpack attributes.
    vec3 positionHigh = positionHighAndScaleX.xyz;
    vec3 positionLow = positionLowAndScaleY.xyz;
    vec2 scale = vec2(positionHighAndScaleX.w, positionLowAndScaleY.w);

    float show = compressedAttribute0.x;
    float flatCloud = compressedAttribute0.y;
    vec2 textureCoordinates = compressedAttribute0.wz;
    vec3 cloudSize = compressedAttribute1.xyz;

#ifdef INSTANCED
    vec2 dir = direction;
#else
    vec2 dir = textureCoordinates;
#endif

    vec2 offset = dir - vec2(0.5, 0.5);
    vec2 scaledOffset = scale * offset;
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = vec4(0.0);
    if(flatCloud > 0.0) {
        vec4 corner = p + vec4(scaledOffset.x, 0, scaledOffset.y, 0);
        positionEC = czm_modelViewRelativeToEye * corner;
    } else {
        positionEC = czm_modelViewRelativeToEye * p;
        positionEC.xy += scaledOffset;
    }
    
    positionEC.xyz *= show;
    gl_Position = czm_projection * positionEC;

    v_textureCoordinates = offset;
    if(flatCloud > 0.0) {
        v_cloudSize = vec3(scale.x, 1.0, scale.y);
    } else {
        v_cloudSize = cloudSize;
    }
    v_cloudFlat = flatCloud;
}