attribute vec4 position;
attribute vec2 projectedCoordinates;

uniform vec2 u_textureDimensions;
uniform vec4 u_westSouthInverseWidthHeight;

varying vec2 v_textureCoordinates;

void main()
{
    v_textureCoordinates.x = (projectedCoordinates.x - u_westSouthInverseWidthHeight.x) * u_westSouthInverseWidthHeight.z;
    v_textureCoordinates.y = (projectedCoordinates.y - u_westSouthInverseWidthHeight.y) * u_westSouthInverseWidthHeight.w;

    gl_Position = czm_viewportOrthographic * (position * vec4(u_textureDimensions, 1.0, 1.0));
}
