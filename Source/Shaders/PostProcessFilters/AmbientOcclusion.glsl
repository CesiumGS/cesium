uniform sampler2D u_colorTexture;
uniform sampler2D u_aoTexture;
uniform bool u_HBAOonly;
varying vec2 v_textureCoordinates;
void main(void)
{
    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb;
    vec3 ao = texture2D(u_aoTexture, v_textureCoordinates).rgb;
    if(u_HBAOonly)
      gl_FragColor = vec4(ao, 1.0);
    else
      gl_FragColor = vec4(ao * color, 1.0);
}
