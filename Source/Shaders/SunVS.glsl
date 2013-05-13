attribute vec2 direction;

varying vec2 v_textureCoordinates;

void main() 
{
    vec4 position;
    if (czm_morphTime == 1.0)
    {
        position = vec4(czm_sunPositionWC, 1.0);
    }
    else
    {
        position = vec4(czm_sunPositionColumbusView.zxy, 1.0);
    }
    
    vec4 positionEC = czm_view * position;
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);
    
    vec4 limb = czm_eyeToWindowCoordinates(positionEC + vec4(czm_solarRadius, 0.0, 0.0, 0.0));
    vec2 halfSize = vec2(length(limb.xy - positionWC.xy));
    halfSize *= 30.0;
    halfSize *= ((direction * 2.0) - 1.0);
    
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy + halfSize, -positionWC.z, 1.0);
    
    v_textureCoordinates = direction;
}
