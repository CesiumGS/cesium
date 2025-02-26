in vec4 position;
in vec2 textureCoordinates;

out vec2 v_textureCoordinates;

void main() 
{
    gl_Position = position;
    v_textureCoordinates = textureCoordinates;
}
