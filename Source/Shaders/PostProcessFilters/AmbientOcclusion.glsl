uniform sampler2D u_colorTexture;
uniform sampler2D u_aoTexture;
uniform bool u_aoOnly;
varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb;
    vec3 ao = texture2D(u_aoTexture, v_textureCoordinates).rgb;
    gl_FragColor.rgb = u_aoOnly ? ao : ao * color;
}
