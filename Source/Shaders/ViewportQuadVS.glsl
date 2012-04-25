attribute vec4 position;
attribute vec2 textureCoordinates;

varying vec2 v_textureCoordinates;

void main() 
{
    gl_Position = agi_viewportOrthographic * position;
    v_textureCoordinates = textureCoordinates;
}