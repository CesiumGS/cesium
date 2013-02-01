uniform sampler2D u_texture;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;

varying vec2 v_textureCoordinates;

void main()
{
    // The clamp below works around an apparent bug in Chrome Canary v23.0.1241.0
    // where the fragment shader sees textures coordinates < 0.0 and > 1.0 for the
    // fragments on the edges of tiles even though the vertex shader is outputting
    // coordinates strictly in the 0-1 range.
    vec2 geographicUV = clamp(v_textureCoordinates, 0.0, 1.0);
    vec2 webMercatorUV = geographicUV;
    
    float currentLatitude = mix(u_southLatitude, u_northLatitude, geographicUV.y);
    float fraction = czm_latitudeToWebMercatorFraction(currentLatitude, u_southMercatorYLow, u_southMercatorYHigh, u_oneOverMercatorHeight);
    
    webMercatorUV = vec2(geographicUV.x, fraction);
    
    gl_FragColor = texture2D(u_texture, webMercatorUV);
}
