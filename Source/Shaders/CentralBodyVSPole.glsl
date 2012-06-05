attribute vec4 position;

varying vec2 v_textureCoordinates;

void main() 
{
    float x = (position.x - float(agi_viewport.x)) / float(agi_viewport.z);
    float y = (position.y - float(agi_viewport.y)) / float(agi_viewport.w);
    v_textureCoordinates = vec2(x, y);
    
    gl_Position = agi_viewportOrthographic * position;
}