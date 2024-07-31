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
#else
    // Find the 2D texture coordinate within the selected cubemap face.
    // See the OpenGL 4.2 spec, section 3.9.10
    float largestComponent = czm_maximumComponent(abs(p));
    vec2 st;
    if (abs(p.x) == largestComponent) {
        st = vec2(-p.z * sign(p.x), -p.y);
    } else if (abs(p.y) == largestComponent) {
        st = vec2(p.x, p.z * sign(p.y));
    } else {
        st = vec2(p.x * sign(p.z), -p.y);
    }
    st = 0.5 * (st / largestComponent + 1.0);

    // Compute the hardware-selected mipmap LOD.
    float stx = length(dFdx(st));
    float sty = length(dFdy(st));
    float hardwareLod = max(log2(max(stx, sty)), 0.0);

    // Set the bias to correct the hardware-selected LOD to the desired LOD.
    float bias = lod - hardwareLod;

    return textureCube(sampler, p, bias);
#endif
}