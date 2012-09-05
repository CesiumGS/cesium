attribute vec4 position;

varying vec2 v_textureCoordinates;

void main() 
{
    float x = (position.x - czm_viewport.x) / czm_viewport.z;
    float y = (position.y - czm_viewport.y) / czm_viewport.w;
    v_textureCoordinates = vec2(x, y);
    
    gl_Position = czm_viewportOrthographic * position;
}