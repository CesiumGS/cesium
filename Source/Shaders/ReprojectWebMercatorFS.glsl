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
    float sinLatitude = sin(currentLatitude);
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    
    // mercatorY - u_southMercatorY in simulated double precision.
    float t1 = 0.0 - u_southMercatorYLow;
    float e = t1 - 0.0;
    float t2 = ((-u_southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - u_southMercatorYHigh;
    float highDifference = t1 + t2;
    float lowDifference = t2 - (highDifference - t1);
    
    webMercatorUV = vec2(geographicUV.x, highDifference * u_oneOverMercatorHeight + lowDifference * u_oneOverMercatorHeight);
    
    gl_FragColor = texture2D(u_texture, webMercatorUV);
}
