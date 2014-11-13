attribute vec4 position;

uniform vec2 u_textureDimensions;

uniform float u_northLatitude;
uniform float u_southLatitude;
uniform float u_southMercatorYHigh;
uniform float u_southMercatorYLow;
uniform float u_oneOverMercatorHeight;
uniform float u_webMercatorY[64];

varying vec2 v_textureCoordinates;

void main()
{
    float indexWithFraction = position.y * 63.0;
    float indexFloor = floor(indexWithFraction);
    int index = int(indexFloor);
    float offset = indexWithFraction - indexFloor;

    float webMercatorYBelow = u_webMercatorY[index];
    float webMercatorYAbove = u_webMercatorY[index + 1];
    float webMercatorY = mix(webMercatorYBelow, webMercatorYAbove, offset);

    v_textureCoordinates = vec2(position.x, webMercatorY);
    gl_Position = czm_viewportOrthographic * (position * vec4(u_textureDimensions, 1.0, 1.0));
}
