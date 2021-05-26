/**
 * Parameters for {@link czm_pbrLighting}
 *
 * @name czm_material
 * @glslStruct
 *
 * @property {vec3} diffuseColor the diffuse color of the material for the lambert term of the rendering equation
 * @property {float} roughness a value from 0.0 to 1.0 that indicates how rough the surface of the material is.
 * @property {vec3} f0 The reflectance of the material at normal incidence
 */
struct czm_pbrParameters
{
    vec3 diffuseColor;
    float roughness;
    vec3 f0;
};
