attribute vec4 position;

uniform vec2 u_textureDimensions;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;
uniform mat4 czm_viewportOrthographic;

varying vec2 v_textureCoordinates;

float czm_latitudeToWebMercatorFraction(float latitude, float southMercatorYLow, float southMercatorYHigh, float oneOverMercatorHeight)
{
    float sinLatitude = sin(latitude);
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));

    // mercatorY - southMercatorY in simulated double precision.
    float t1 = 0.0 - southMercatorYLow;
    float e = t1 - 0.0;
    float t2 = ((-southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - southMercatorYHigh;
    float highDifference = t1 + t2;
    float lowDifference = t2 - (highDifference - t1);

    return highDifference * oneOverMercatorHeight + lowDifference * oneOverMercatorHeight;
}

void main()
{
    float currentLatitude = mix(u_southLatitude, u_northLatitude, position.y);
    float fraction = czm_latitudeToWebMercatorFraction(currentLatitude, u_southMercatorYLow, u_southMercatorYHigh, u_oneOverMercatorHeight);
    v_textureCoordinates = vec2(position.x, fraction);
//    v_textureCoordinates = vec2(position.x, position.y);
    gl_Position = czm_viewportOrthographic * (position * vec4(u_textureDimensions, 1.0, 1.0));
}
