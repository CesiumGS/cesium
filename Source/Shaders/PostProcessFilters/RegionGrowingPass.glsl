#extension GL_EXT_frag_depth : enable
uniform sampler2D pointCloud_colorTexture;
uniform sampler2D pointCloud_depthTexture;
varying vec2 v_textureCoordinates;
void main() {
    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates);
    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r;
    vec3 newColor = color.rgb;
    gl_FragColor = vec4(newColor, color.a);
    gl_FragDepthEXT = depth;
}
