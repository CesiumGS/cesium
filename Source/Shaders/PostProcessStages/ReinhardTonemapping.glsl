uniform sampler2D colorTexture;
uniform float exposure;

varying vec2 v_textureCoordinates;

void main()
{
    vec3 color = texture2D(colorTexture, v_textureCoordinates).rgb;

    //if (length(color) > length(vec3(1.0))) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
    if (color.r > 10.0 || color.g > 10.0 || color.b > 10.0) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }

    vec3 toneMapped = vec3(1.0) - exp(-color * exposure);
    gl_FragColor = vec4(toneMapped, 1.0);
}
