attribute vec4 position;

uniform vec2 u_textureDimensions;
uniform float u_webMercatorT[64];

varying vec2 v_textureCoordinates;

void main()
{
    float indexWithFraction = position.y * 63.0;

    // Find the index of the Web Mercator T coordinate for the latitude less than or equal
    // to this latitude.  Ensure this value is <= 62 so that we can add one to it below and
    // still have a valid index.
    float indexFloor = min(62.0, floor(indexWithFraction));
    int index = int(indexFloor);

    float webMercatorTBelow = u_webMercatorT[index];
    float webMercatorTAbove = u_webMercatorT[index + 1];

    // Compute the actual Web Mercator T coordinate by lineary interpolating between the
    // surrounding values in the lookup table.
    float offset = indexWithFraction - indexFloor;
    float webMercatorT = mix(webMercatorTBelow, webMercatorTAbove, offset);

    v_textureCoordinates = vec2(position.x, webMercatorT);
    gl_Position = czm_viewportOrthographic * (position * vec4(u_textureDimensions, 1.0, 1.0));
}
