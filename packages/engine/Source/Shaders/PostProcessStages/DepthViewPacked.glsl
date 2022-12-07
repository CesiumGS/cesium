uniform sampler2D u_depthTexture;

varying vec2 v_textureCoordinates;

void main()
{
    float z_window = czm_unpackDepth(texture2D(u_depthTexture, v_textureCoordinates));
    z_window = czm_reverseLogDepth(z_window);
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);
    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);
    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);
}
