/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Core/clone',
        '../../Core/createGuid',
        '../../Core/Jobs',
        '../../ThirdParty/Chain',
        './combineMaterials',
        './BlendMap',
        './AlphaMapMaterial',
        './AsphaltMaterial',
        './BlobMaterial',
        './BrickMaterial',
        './BumpMapMaterial',
        './CementMaterial',
        './CheckerboardMaterial',
        './ColorMaterial',
        './DiffuseMapMaterial',
        './DistanceIntervalMaterial',
        './DotMaterial',
        './EmissionMapMaterial',
        './FacetMaterial',
        './FresnelMaterial',
        './GrassMaterial',
        './HorizontalStripeMaterial',
        './NormalMapMaterial',
        './ReflectionMaterial',
        './RefractionMaterial',
        './SpecularMapMaterial',
        './TieDyeMaterial',
        './VerticalStripeMaterial',
        './WoodMaterial'
    ], function(
        DeveloperError,
        clone,
        createGuid,
        Jobs,
        Chain,
        combineMaterials,
        BlendMap,
        AlphaMapMaterial,
        AsphaltMaterial,
        BlobMaterial,
        BrickMaterial,
        BumpMapMaterial,
        CementMaterial,
        CheckerboardMaterial,
        ColorMaterial,
        DiffuseMapMaterial,
        DistanceIntervalMaterial,
        DotMaterial,
        EmissionMapMaterial,
        FacetMaterial,
        FresnelMaterial,
        GrassMaterial,
        HorizontalStripeMaterial,
        NormalMapMaterial,
        ReflectionMaterial,
        RefractionMaterial,
        SpecularMapMaterial,
        TieDyeMaterial,
        VerticalStripeMaterial,
        WoodMaterial) {
    "use strict";

    /**
     * CompositeMaterial is different than other materials in that it
     * combines multiple base materials into one. A CompositeMaterial is
     * specified in JSON and contains 'id', 'textures', 'materials', and 'components' fields.
     * 'id' is an optional string identifier for the composite material's name.
     * If an id is provided, the composite material can be used by other composite materials.
     * 'textures' is a series of id and image path pairs. Check example below for constructing
     * 2D textures and cube maps.
     * 'materials' is a series of material containers. Each material container has
     * an identifier (e.g. 'diffuseMap1') followed by a material type (e.g. 'DiffuseMapMaterial')
     * and all of the necessary material properties to instantiate the material. The material type can
     * either be one of the traditional materials or a BlendMap. A BlendMap samples from a
     * texture and returns a float that can be used to alter material values. A texture value may be
     * referenced by a texture id from the 'textures' field.
     * 'components' is a sequence of material properties including 'diffuse', 'specular',
     * 'normal', 'emission', and 'alpha'. Each component's value is expressed with glsl syntax
     * that can include material ids from the 'materials' field.
     * If a component is not specified, agi_getDefaultMaterial is used.
     *
     * @name CompositeMaterial
     * @constructor
     *
     * @example

     * polygon.material = new Cesium.CompositeMaterial(scene.getContext(), {
     *    'id' : 'CompositeMaterial1',
     *    'textures' : {
     *        'cesium_logo_texture' : '../../Images/Cesium_Logo_Color.jpg',
     *        'alpha_map_texture' : '../../Images/alpha_map.png',
     *        'cube_map' : {
     *            'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
     *            'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
     *            'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
     *            'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
     *            'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
     *            'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
     *        }
     *    },
     *    'materials' : {
     *        'reflection' : {
     *            'type' : 'ReflectionMaterial',
     *            'cubeMap' : 'cube_map'
     *        },
     *        'diffuseMap' : {
     *            'type' : 'DiffuseMapMaterial',
     *            'texture' : 'cesium_logo_texture'
     *        },
     *        'blend_map' : {
     *            'type' : 'BlendMap',
     *            'texture' : 'alpha_map_texture'
     *        }
     *    },
     *    'components' : {
     *        'diffuse' : '(reflection.diffuse + diffuseMap.diffuse) / 2.0',
     *        'specular' : 'blend_map / 100.0'
     *    }
     * });
     */

    function CompositeMaterial(context, template) {
        this.context = context;
        var t = template || {};

        this.compositeMaterialID = t.id;
        this.textureTemplates = t.textures || {};
        this.materialTemplates = t.materials || {};
        this.materialComponents = t.components || {};
        this.texturesToMaterialsMap = {};

        // Only process if it has a components field
        if (typeof this.materialComponents !== 'undefined') {
            var materialContainers = this._constructMaterials();
            var combinedMaterial = combineMaterials(materialContainers);
            var shaderSource = combinedMaterial._getShaderSource();
            this._finalizeTextures();

            // Build the method definition
            shaderSource += '#line 0\n';
            shaderSource += 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n';
            shaderSource += 'agi_material material = agi_getDefaultMaterial(materialInput);\n';

            // Loop over all the components ('diffuse', 'normal', etc) in the template and
            // replace the material ids from each component expression with their expanded forms.
            // Example: 'diffuse' : 'mix(reflection.diffuse, diffuseMap.diffuse, blender)'
            // Becomes: material.diffuse = mix(
            //     agi_getMaterial_reflection_{guid}(materialInput).diffuse,
            //     agi_getMaterial_diffuseMap_{guid}(materialInput).diffuse,
            //     agi_getBlendFactor_blender_{guid}(materialInput));

            for (var component in this.materialComponents) {
                if (this.materialComponents.hasOwnProperty(component)) {
                    var expression = this.materialComponents[component];
                    // Replace each material id with the expanded method call.
                    for (var i = 0; i < materialContainers.length; i++) {
                        var materialContainer = materialContainers[i];
                        if (expression.indexOf(materialContainer.id) !== -1) {
                            var expandedMethod = materialContainer.methodName + '(materialInput)';
                            expression = expression.replace(new RegExp(materialContainer.id, 'g'), expandedMethod);
                        }
                    }
                    shaderSource += 'material.' + component + ' = ' + expression + ';\n';
                }
            }

            shaderSource += 'return material;\n}\n';
            this.shaderSource = shaderSource;
            this._uniforms = combinedMaterial._uniforms;

            // Register composite material to factory if id is provided.
            if (typeof this.compositeMaterialID !== 'undefined') {
                this._materialFactory._compositeMaterials[this.compositeMaterialID] = this;
            }
        }
    }

    // Convert all the material templates to materials.
    CompositeMaterial.prototype._constructMaterials = function() {
        var materialContainers = [];
        if (typeof this.materialTemplates !== 'undefined') {
            for (var materialID in this.materialTemplates) {
                if(this.materialTemplates.hasOwnProperty(materialID)) {
                    // Create a unique method name.
                    var materialTemplate = this.materialTemplates[materialID];
                    var originalMethodName = (materialTemplate.type === 'BlendMap') ? 'agi_getBlendFactor' : 'agi_getMaterial';
                    var guid = createGuid().replace(new RegExp('-', 'g'), '');
                    var newMethodName = originalMethodName + '_' + materialID + '_' + guid;

                    // Register material with textures so it can be updated once the texture loads.
                    // Replaces a textureID with a texture object.
                    if (typeof this.textureTemplates !== 'undefined') {
                        for (var materialProperty in materialTemplate) {
                            if (materialTemplate.hasOwnProperty(materialProperty)) {
                                var value = materialTemplate[materialProperty];
                                if (this.textureTemplates.hasOwnProperty(value)) {
                                    // Register texture that the material is referencing.
                                    var textureID = value;
                                    this.texturesToMaterialsMap[textureID] = this.texturesToMaterialsMap[textureID] || [];
                                    this.texturesToMaterialsMap[textureID].push({'id' : materialID, 'property' : materialProperty});

                                    // Give the material a default texture while the real one loads.
                                    var defaultTexture;
                                    var textureType = typeof this.textureTemplates[textureID];
                                    if (textureType === 'string') {
                                        defaultTexture = this.context.getDefaultTexture();
                                    }
                                    else if (textureType === 'object') {
                                        defaultTexture = this.context.getDefaultCubeMap();
                                    }
                                    materialTemplate[materialProperty] = defaultTexture;
                                }
                            }
                        }
                    }

                    // Construct material
                    var material = this._materialFactory.constructMaterial(materialTemplate.type, materialTemplate);
                    material.shaderSource = material.shaderSource.replace(new RegExp(originalMethodName, 'g'), newMethodName);
                    this[materialID] = material;

                    materialContainers.push({
                       id : materialID,
                       material : material,
                       methodName : newMethodName
                    });
                }
            }
        }
        return materialContainers;
    };

    CompositeMaterial.prototype._finalizeTextures = function() {
        var that = this;
        var onloadTexture = function (image, textureID) {
            return function() {
                var texture = that.context.createTexture2D({source : image});
                var materials = that.texturesToMaterialsMap[textureID];
                for (var i = 0; i < materials.length; i++) {
                    var material = materials[i];
                    that[material.id][material.property] = texture;
                }
            };
        };
        var onloadCubeMap = function (textureID) {
            return function() {
                var cubeMapData = that.textureTemplates[textureID];
                var cubeMap = that.context.createCubeMap({
                    source : {
                        positiveX : this.images[cubeMapData.positiveX],
                        negativeX : this.images[cubeMapData.negativeX],
                        positiveY : this.images[cubeMapData.positiveY],
                        negativeY : this.images[cubeMapData.negativeY],
                        positiveZ : this.images[cubeMapData.positiveZ],
                        negativeZ : this.images[cubeMapData.negativeZ]
                    }
                });
                var materials = that.texturesToMaterialsMap[textureID];
                for (var i = 0; i < materials.length; i++) {
                    var material = materials[i];
                    that[material.id][material.property] = cubeMap;
                }
            };
        };

        for (var textureID in this.texturesToMaterialsMap) {
            if (this.texturesToMaterialsMap.hasOwnProperty(textureID)) {
                var textureType = typeof this.textureTemplates[textureID];
                if (textureType === 'string') {
                    // Texture
                    var image = new Image();
                    image.onload = onloadTexture(image, textureID);
                    image.src = this.textureTemplates[textureID];
                }
                else if (textureType === 'object') {
                    // Cube map
                    var cubeMapData = this.textureTemplates[textureID];
                    Chain.run(
                        Jobs.downloadImage(cubeMapData.positiveX),
                        Jobs.downloadImage(cubeMapData.negativeX),
                        Jobs.downloadImage(cubeMapData.positiveY),
                        Jobs.downloadImage(cubeMapData.negativeY),
                        Jobs.downloadImage(cubeMapData.positiveZ),
                        Jobs.downloadImage(cubeMapData.negativeZ)
                    ).thenRun(onloadCubeMap(textureID));
                }
            }
        }
    };

    CompositeMaterial.prototype._materialFactory = {
        _materials : {
            'BlendMap' : BlendMap,
            'AlphaMapMaterial' : AlphaMapMaterial,
            'AsphaltMaterial' : AsphaltMaterial,
            'BlobMaterial' : BlobMaterial,
            'BrickMaterial' : BrickMaterial,
            'BumpMapMaterial' : BumpMapMaterial,
            'CementMaterial' : CementMaterial,
            'CheckerboardMaterial' : CheckerboardMaterial,
            'ColorMaterial' : ColorMaterial,
            'DiffuseMapMaterial' : DiffuseMapMaterial,
            'DistanceIntervalMaterial' : DistanceIntervalMaterial,
            'DotMaterial' : DotMaterial,
            'EmissionMapMaterial' : EmissionMapMaterial,
            'FacetMaterial' : FacetMaterial,
            'FresnelMaterial' : FresnelMaterial,
            'GrassMaterial' : GrassMaterial,
            'HorizontalStripeMaterial' : HorizontalStripeMaterial,
            'NormalMapMaterial' : NormalMapMaterial,
            'ReflectionMaterial' : ReflectionMaterial,
            'RefractionMaterial' : RefractionMaterial,
            'SpecularMapMaterial' : SpecularMapMaterial,
            'TieDyeMaterial' : TieDyeMaterial,
            'VerticalStripeMaterial' : VerticalStripeMaterial,
            'WoodMaterial' : WoodMaterial
        },
        _compositeMaterials : {},
        constructMaterial : function(name, template) {
            if (this._materials.hasOwnProperty(name) === true) {
                return (new this._materials[name](template));
            }
            else if (this._compositeMaterials.hasOwnProperty(name) === true) {
                return this._compositeMaterials[name];
            }
            else {
                throw new DeveloperError('Material with type ' + name + ' does not exist.');
            }
        }
    };

    CompositeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               this.shaderSource;
    };

    return CompositeMaterial;
});
