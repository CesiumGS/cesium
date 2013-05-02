attribute vec2 direction;

uniform vec2 u_size;

varying vec2 v_textureCoordinates;

const vec2 czm_highResolutionSnapScale = vec2(1.0, 1.0);    // TODO

void main() 
{
    vec4 positionEC = czm_view * vec4(czm_sunPositionWC, 1.0);
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    
    vec2 halfSize = u_size * 0.5 * czm_highResolutionSnapScale;
    halfSize *= ((direction * 2.0) - 1.0);
    
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy + halfSize, -positionWC.z, 1.0);
    
    v_textureCoordinates = direction;
}
