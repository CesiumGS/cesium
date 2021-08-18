#ifdef INSTANCED
attribute vec2 direction;
#endif
attribute vec4 positionHighAndScaleX;
attribute vec4 positionLowAndScaleY;
attribute vec4 compressedAttribute0;
attribute vec4 compressedAttribute1;

varying vec2 v_offset;
varying vec3 v_maximumSize;
varying float v_slice;

void main() {
    // Unpack attributes.
    vec3 positionHigh = positionHighAndScaleX.xyz;
    vec3 positionLow = positionLowAndScaleY.xyz;
    vec2 scale = vec2(positionHighAndScaleX.w, positionLowAndScaleY.w);

    float show = compressedAttribute0.x;
    vec2 coordinates = compressedAttribute0.wz;
    vec3 maximumSize = compressedAttribute1.xyz;
    float slice = compressedAttribute1.w;

#ifdef INSTANCED
    vec2 dir = direction;
#else
    vec2 dir = coordinates;
#endif

    vec2 offset = dir - vec2(0.5, 0.5);
    vec2 scaledOffset = scale * offset;
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    positionEC.xy += scaledOffset;
    
    positionEC.xyz *= show;
    gl_Position = czm_projection * positionEC;

    v_offset = offset;
    v_maximumSize = maximumSize;
    v_slice = slice;
}