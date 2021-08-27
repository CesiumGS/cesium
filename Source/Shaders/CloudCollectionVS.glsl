#ifdef INSTANCED
attribute vec2 direction;
#endif
attribute vec4 positionHighAndScaleX;
attribute vec4 positionLowAndScaleY;
attribute vec4 packedAttribute0;
attribute vec4 packedAttribute1;

varying vec2 v_offset;
varying vec3 v_maximumSize;
varying float v_slice;
varying float v_brightness;

void main() {
    // Unpack attributes.
    vec3 positionHigh = positionHighAndScaleX.xyz;
    vec3 positionLow = positionLowAndScaleY.xyz;
    vec2 scale = vec2(positionHighAndScaleX.w, positionLowAndScaleY.w);

    float show = packedAttribute0.x;
    float brightness = packedAttribute0.y;
    vec2 coordinates = packedAttribute0.wz;
    vec3 maximumSize = packedAttribute1.xyz;
    float slice = packedAttribute1.w;

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
    v_brightness = brightness;

}
