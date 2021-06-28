varying vec3 v_cubeMapCoordinates;
uniform samplerCube cubeMap;

void main()
{
    vec4 rgba = textureCube(cubeMap, v_cubeMapCoordinates);
    #ifdef RGBA_NORMALIZED
        gl_FragColor = vec4(rgba.rgb, 1.0);
    #else
        float m = rgba.a * 16.0;
        vec3 r = rgba.rgb * m;
        gl_FragColor = vec4(r * r, 1.0);
    #endif
}
