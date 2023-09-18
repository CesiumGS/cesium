//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * A wrapper around the texture (WebGL2) / textureCube (WebGL1)\n\
 * function to allow for WebGL 1 support.\n\
 * \n\
 * @name czm_textureCube\n\
 * @glslFunction\n\
 *\n\
 * @param {samplerCube} sampler The sampler.\n\
 * @param {vec3} p The coordinates to sample the texture at.\n\
 */\n\
vec4 czm_textureCube(samplerCube sampler, vec3 p) {\n\
#if __VERSION__ == 300\n\
    return texture(sampler, p);\n\
#else  \n\
    return textureCube(sampler, p);\n\
#endif\n\
}";
