in vec3 v_cubeMapCoordinates;
uniform samplerCube cubeMap;

void main()
{
    vec4 rgba = czm_textureCube(cubeMap, v_cubeMapCoordinates);
    #ifdef RGBA_NORMALIZED
        out_FragColor = vec4(rgba.rgb, 1.0);
    #else
        float m = rgba.a * 16.0;
        vec3 r = rgba.rgb * m;
        out_FragColor = vec4(r * r, 1.0);
    #endif
}
