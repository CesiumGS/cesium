attribute vec3 position;
attribute vec2 direction;                       // in screen space
attribute vec4 textureCoordinatesAndImageSize;  // size in normalized texture coordinates
attribute vec4 color;
attribute vec3 originAndShow;                   // show is 0.0 (false) or 1.0 (true)
attribute vec2 pixelOffset;
attribute vec4 eyeOffsetAndScale;                       // eye offset in meters
attribute vec4 pickColor;

uniform vec2 u_atlasSize;
uniform float u_clampToPixel; // clamp is 1.0 (true) or 0.0 (false)

const vec2 czm_highResolutionSnapScale = vec2(1.0, 1.0);    // TODO

varying vec2 v_textureCoordinates;
varying vec4 v_color;
varying vec4 v_pickColor;

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

    vec4 positionEC = czm_modelView * vec4(position, 1.0);
    positionEC = czm_eyeOffset(positionEC, eyeOffset);
    positionEC.xyz *= show;
    
    ///////////////////////////////////////////////////////////////////////////     
    
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    
    vec2 halfSize = u_atlasSize * imageSize * 0.5 * scale * czm_highResolutionSnapScale;
    halfSize *= ((direction * 2.0) - 1.0);

    positionWC.xy += (origin * abs(halfSize)) + halfSize;
    positionWC.xy += (pixelOffset * czm_highResolutionSnapScale);
    positionWC.xy = mix(positionWC.xy, floor(positionWC.xy), u_clampToPixel);

    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    v_textureCoordinates = textureCoordinates;
    v_color = color;
    v_pickColor = pickColor;
}
