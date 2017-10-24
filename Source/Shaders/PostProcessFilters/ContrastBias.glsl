uniform sampler2D u_colorTexture;
uniform float u_contrast;
uniform float u_brightness;

varying vec2 v_textureCoordinates;

void main(void)
{
    vec3 sceneColor = texture2D(u_colorTexture, v_textureCoordinates).xyz;
    sceneColor = czm_RGBToHSB(sceneColor);
    sceneColor.z += u_brightness;
    sceneColor = czm_HSBToRGB(sceneColor);

    float factor = (259.0 * (u_contrast + 255.0)) / (255.0 * (259.0 - u_contrast));
    sceneColor = factor * (sceneColor - vec3(0.5)) + vec3(0.5);
    gl_FragColor = vec4(sceneColor, 1.0);
}
