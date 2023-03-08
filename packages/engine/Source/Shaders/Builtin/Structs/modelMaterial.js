//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Struct for representing a material for a {@link Model}. The model\n\
 * rendering pipeline will pass this struct between material, custom shaders,\n\
 * and lighting stages. This is not to be confused with {@link czm_material}\n\
 * which is used by the older Fabric materials system, although they are similar.\n\
 * <p>\n\
 * All color values (diffuse, specular, emissive) are in linear color space.\n\
 * </p>\n\
 *\n\
 * @name czm_modelMaterial\n\
 * @glslStruct\n\
 *\n\
 * @property {vec3} diffuse Incoming light that scatters evenly in all directions.\n\
 * @property {float} alpha Alpha of this material. 0.0 is completely transparent; 1.0 is completely opaque.\n\
 * @property {vec3} specular Color of reflected light at normal incidence in PBR materials. This is sometimes referred to as f0 in the literature.\n\
 * @property {float} roughness A number from 0.0 to 1.0 representing how rough the surface is. Values near 0.0 produce glossy surfaces, while values near 1.0 produce rough surfaces.\n\
 * @property {vec3} normalEC Surface's normal in eye coordinates. It is used for effects such as normal mapping. The default is the surface's unmodified normal.\n\
 * @property {float} occlusion Ambient occlusion recieved at this point on the material. 1.0 means fully lit, 0.0 means fully occluded.\n\
 * @property {vec3} emissive Light emitted by the material equally in all directions. The default is vec3(0.0), which emits no light.\n\
 */\n\
struct czm_modelMaterial {\n\
    vec3 diffuse;\n\
    float alpha;\n\
    vec3 specular;\n\
    float roughness;\n\
    vec3 normalEC;\n\
    float occlusion;\n\
    vec3 emissive;\n\
};\n\
";
