/*global define*/
define([
        './addExtensionsRequired',
        './ForEach',
        './getJointCountForMaterials',
        './removeExtensionsUsed',
        '../../Core/defined'
    ], function(
        addExtensionsRequired,
        ForEach,
        getJointCountForMaterials,
        removeExtensionsUsed,
        defined) {
    'use strict';

    /**
     * Convert PBR materials to use a KHR_materials_common BLINN shader.
     * This is a lossy conversion, and as such should only be used for
     * compatibility reasons. Normal texture and metallic roughness information
     * will be lost, and some color or texture information may be lost.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with materials converted to KHR_materials_common
     */
    function pbrToMaterialsCommon(gltf) {
        var materialJointCount = getJointCountForMaterials(gltf);
        ForEach.material(gltf, function(material, materialId) {
            var values = {
                ambient : [ 0.0, 0.0, 0.0, 1.0 ],
                diffuse : [ 0.0, 0.0, 0.0, 1.0 ],
                emission : [ 0.0, 0.0, 0.0, 1.0 ],
                specular : [ 0.0, 0.0, 0.0, 1.0],
                shininess :  [ 0.0 ]
            };
            var pbrMetallicRoughness = material.pbrMetallicRoughness;
            var isPBR = defined(pbrMetallicRoughness) ||
                (defined(material.extensions) && defined(material.extensions.KHR_materials_pbrSpecularGlossiness) ||
                defined(material.occlusionTexture) ||
                defined(material.emissiveFactor) ||
                defined(material.emissiveTexture) ||
                defined(material.doubleSided));

            if (defined(pbrMetallicRoughness)) {
                var baseColorFactor = pbrMetallicRoughness.baseColorFactor;
                if (defined(baseColorFactor)) {
                    values.diffuse = baseColorFactor;
                }
                var baseColorTexture = pbrMetallicRoughness.baseColorTexture;
                if (defined(baseColorTexture)) {
                    values.diffuse = [baseColorTexture.index];
                }
            }
            var extensions = material.extensions;
            if (defined(extensions)) {
                var pbrSpecularGlossiness = extensions.KHR_materials_pbrSpecularGlossiness;
                if (defined(pbrSpecularGlossiness)) {
                    var diffuseFactor = pbrSpecularGlossiness.diffuseFactor;
                    // Use baseColorTexture if it was defined
                    if (defined(diffuseFactor) && values.diffuse.length > 1) {
                        values.diffuse = diffuseFactor;
                    }
                    // diffuseTexture should be used instead of baseColorTexture if defined
                    var diffuseTexture = pbrSpecularGlossiness.diffuseTexture;
                    if (defined(diffuseTexture)) {
                        values.diffuse = [diffuseTexture.index];
                    }
                    var specularFactor = pbrSpecularGlossiness.specularFactor;
                    if (defined(specularFactor)) {
                        values.specular[0] = specularFactor[0];
                        values.specular[1] = specularFactor[1];
                        values.specular[2] = specularFactor[2];
                    }
                    var glossinessFactor = pbrSpecularGlossiness.glossinessFactor;
                    if (defined(glossinessFactor)) {
                        values.shininess[0] = glossinessFactor;
                    }
                    var specularGlossinessTexture = pbrSpecularGlossiness.specularGlossinessTexture;
                    if (defined(specularGlossinessTexture)) {
                        values.specular = [specularGlossinessTexture.index];
                    }
                }
            }
            var occlusionTexture = material.occlusionTexture;
            if (defined(occlusionTexture)) {
                values.ambient = [occlusionTexture.index];
            }
            var emissiveFactor = material.emissiveFactor;
            if (defined(emissiveFactor)) {
                values.emission[0] = emissiveFactor[0];
                values.emission[1] = emissiveFactor[1];
                values.emission[2] = emissiveFactor[2];
            }
            var emissiveTexture = material.emissiveTexture;
            if (defined(emissiveTexture)) {
                values.emission = [emissiveTexture.index];
            }
            var doubleSided = material.doubleSided;
            if (isPBR) {
                delete material.doubleSided;
                delete material.emissiveFactor;
                delete material.emissiveTexture;
                delete material.normalTexture;
                delete material.occlusionTexture;
                delete material.pbrMetallicRoughness;
                var materialsCommon = {
                    technique: 'BLINN',
                    values: values
                };
                var jointCount = materialJointCount[materialId];
                if (defined(jointCount)) {
                    materialsCommon.jointCount = jointCount;
                }
                if (defined(doubleSided)) {
                    materialsCommon.doubleSided = doubleSided;
                }
                material.extensions = {
                    KHR_materials_common: materialsCommon
                };
                addExtensionsRequired(gltf, 'KHR_materials_common');
                removeExtensionsUsed(gltf, 'KHR_materials_pbrSpecularGlossiness');
            }
        });
    }
    return pbrToMaterialsCommon;
});
