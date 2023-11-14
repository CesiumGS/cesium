/**
 * Holds material information that can be used for lighting. Returned by all czm_getMaterial functions.
 *
 * @name czm_material
 * @glslStruct
 *
 * @property {vec3} diffuse Incoming light that scatters evenly in all directions.
 * @property {float} specular Intensity of incoming light reflecting in a single direction.
 * @property {float} shininess The sharpness of the specular reflection.  Higher values create a smaller, more focused specular highlight.
 * @property {vec3} normal Surface's normal in eye coordinates. It is used for effects such as normal mapping. The default is the surface's unmodified normal.
 * @property {vec3} emission Light emitted by the material equally in all directions. The default is vec3(0.0), which emits no light.
 * @property {float} alpha Alpha of this material. 0.0 is completely transparent; 1.0 is completely opaque.
 */
struct czm_material
{
    vec3 diffuse;
    float specular;
    float shininess;
    vec3 normal;
    vec3 emission;
    float alpha;
};
