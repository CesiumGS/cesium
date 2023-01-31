//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Holds material information that can be used for lighting. Returned by all czm_getMaterial functions.\n\
 *\n\
 * @name czm_material\n\
 * @glslStruct\n\
 *\n\
 * @property {vec3} diffuse Incoming light that scatters evenly in all directions.\n\
 * @property {float} specular Intensity of incoming light reflecting in a single direction.\n\
 * @property {float} shininess The sharpness of the specular reflection.  Higher values create a smaller, more focused specular highlight.\n\
 * @property {vec3} normal Surface's normal in eye coordinates. It is used for effects such as normal mapping. The default is the surface's unmodified normal.\n\
 * @property {vec3} emission Light emitted by the material equally in all directions. The default is vec3(0.0), which emits no light.\n\
 * @property {float} alpha Opacity of this material. 0.0 is completely transparent; 1.0 is completely opaque.\n\
 */\n\
struct czm_material\n\
{\n\
    vec3 diffuse;\n\
    float specular;\n\
    float shininess;\n\
    vec3 normal;\n\
    vec3 emission;\n\
    float alpha;\n\
};\n\
";
