/**
 * A wrapper around the texture (WebGL2) / textureCube (WebGL1)
 * function to allow for WebGL 1 support.
 * 
 * @name czm_textureCube
 * @glslFunction
 *
 * @param {samplerCube} sampler The sampler.
 * @param {vec3} p The coordinate at which to sample the texture.
 */
vec4 czm_textureCube(samplerCube sampler, vec3 p) {
#if __VERSION__ == 300
    return texture(sampler, p);
#else
    return textureCube(sampler, p);
#endif
}

/**
 * A wrapper around the textureLod (WebGL2) / textureCube (WebGL1)
 * function to allow for WebGL 1 support in fragment shaders.
 *
 * @name czm_textureCubeLod
 * @glslFunction
 *
 * @param {samplerCube} sampler The sampler.
 * @param {vec3} p The coordinate at which to sample the texture.
 * @param {float} lod The mipmap level from which to sample.
 */
vec4 czm_textureCube(samplerCube sampler, vec3 p, float lod) {
#if __VERSION__ == 300
    return textureLod(sampler, p, lod);
#elif defined(GL_EXT_shader_texture_lod)
    return textureCubeLodEXT(sampler, p, lod);
#endif
}