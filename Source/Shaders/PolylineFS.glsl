varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_textureCoordinate;

varying vec4 v_pickColor;

void main()
{
    gl_FragColor = v_color; 
    //gl_FragColor = v_outlineColor; 
}