attribute vec4 position;

varying vec2 v_textureCoordinates;

void main() 
{
    float x = (position.x - float(czm_viewport.x)) / float(czm_viewport.z);
    float y = (position.y - float(czm_viewport.y)) / float(czm_viewport.w);
    v_textureCoordinates = vec2(x, y);
    
    gl_Position = czm_viewportOrthographic * position;
}