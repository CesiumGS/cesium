uniform sampler2D u_texture;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;
uniform vec4 u_textureTranslationAndScale;
uniform vec4 u_textureCoordinateExtent;

varying vec2 v_textureCoordinates;

void main()
{
    if (v_textureCoordinates.s < u_textureCoordinateExtent.s ||
        v_textureCoordinates.s > u_textureCoordinateExtent.p ||
        v_textureCoordinates.t < u_textureCoordinateExtent.t ||
        v_textureCoordinates.t > u_textureCoordinateExtent.q)
    {
        discard;
    }

    vec2 translation = u_textureTranslationAndScale.xy;
    vec2 scale = u_textureTranslationAndScale.zw;
    vec2 geographicUV = v_textureCoordinates * scale + translation;
    
    float currentLatitude = mix(u_southLatitude, u_northLatitude, geographicUV.y);
    float fraction = czm_latitudeToWebMercatorFraction(currentLatitude, u_southMercatorYLow, u_southMercatorYHigh, u_oneOverMercatorHeight);
    
    vec2 webMercatorUV = vec2(geographicUV.x, fraction);

    gl_FragColor = texture2D(u_texture, webMercatorUV);
}
