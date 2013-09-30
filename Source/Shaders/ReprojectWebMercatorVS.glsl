attribute vec4 position;

uniform vec2 u_textureDimensions;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;

varying vec2 v_textureCoordinates;

void main()
{
    float currentLatitude = mix(u_southLatitude, u_northLatitude, position.y);
    float fraction = czm_latitudeToWebMercatorFraction(currentLatitude, u_southMercatorYLow, u_southMercatorYHigh, u_oneOverMercatorHeight);
    v_textureCoordinates = vec2(position.x, fraction);
    gl_Position = czm_viewportOrthographic * (position * vec4(u_textureDimensions, 1.0, 1.0));
}
