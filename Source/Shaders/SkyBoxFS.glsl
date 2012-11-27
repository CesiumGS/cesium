uniform samplerCube u_cubeMap;
uniform float u_morphTime;

varying vec3 v_texCoord;

void main()
{
    vec3 rgb = textureCube(u_cubeMap, normalize(v_texCoord)).rgb;
    gl_FragColor = vec4(rgb, u_morphTime);
}
