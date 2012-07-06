/*global define*/
define([
        '../../Core/DeveloperError',
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
     * CompositeMaterial combines multiple base materials into one using a JSON format that
     * contains 'id', 'textures', 'materials', and 'components' fields.
     * 'id' is an optional string identifier. If provided, other composite materials
     * can use this composite material as a building block by treating the id as a material type.
     * 'textures' is a series of id and image path pairs. Check the example below for constructing
     * 2D textures and cube maps.
     * 'materials' is a series of material containers. Each material container has
     * an identifier (e.g. 'diffuseMap1') followed by a material type (e.g. 'DiffuseMapMaterial')
     * and all of the necessary material properties to instantiate the material. The material type can
     * either be one of the traditional materials or a BlendMap. A BlendMap samples from a
     * texture and returns a float that can be used to alter material values. A material that needs a
     * texture or cube map as input should use the appropriate texture id from 'textures'.
     * 'components' is a sequence of material properties including 'diffuse', 'specular',
     * 'normal', 'emission', and 'alpha'. Each component has a glsl-style expression that includes
     * material ids from the 'materials' field. If a component is not specified, the value from
     * agi_getDefaultMaterial is used.
     *
     * @name CompositeMaterial
     * @constructor
     *
     * @example
     *
     * var helperComposite = new CompositeMaterial(context, {
     *     'id' : 'CompositeMaterialReflection',
     *     'textures' : {
     *         'palm_tree_cube_map' : {
     *             'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
     *             'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
     *             'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
     *             'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
     *             'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
     *             'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
     *         }
     *     },
     *     'materials' : {
     *         'reflection' : {
     *             'type' : 'ReflectionMaterial',
     *             'cubeMap' : 'palm_tree_cube_map'
     *         }
     *     },
     *     'components' : {
     *         'diffuse' : 'reflection.diffuse'
     *     }
     * });
     * polygon.material = new CompositeMaterial(context, {
     *     'textures' : {
     *         'cesium_logo_texture' : '../../Images/Cesium_Logo_Color.jpg',
     *         'alpha_map_texture' : '../../Images/alpha_map.png'
     *     },
     *     'materials' : {
     *         'reflection' : {
     *             'type' : 'CompositeMaterialReflection'
     *         },
     *         'diffuseMap' : {
     *             'type' : 'DiffuseMapMaterial',
     *             'texture' : 'cesium_logo_texture'
     *         },
     *         'blend_map' : {
     *             'type' : 'BlendMap',
     *             'texture' : 'alpha_map_texture'
     *         }
     *     },
     *     'components' : {
     *         'diffuse' : '(reflection.diffuse + diffuseMap.diffuse) / 2.0',
     *         'specular' : 'blend_map / 100.0',
     *         'alpha' : 0.9
     *     }
     * });
     *
     * @see BlendMap
     */

    function CompositeMaterial(context, template) {
        this.context = context;
        var t = template || {};

        this.compositeMaterialID = t.id;
        this.textureTemplates = t.textures || {};
        this.materialTemplates = t.materials || {};
        this.materialComponents = t.components || {};
        this.texturesToMaterialsMap = {};

        var materialContainers = this._constructMaterials();
        var combinedMaterial = combineMaterials(materialContainers);
        this._uniforms = combinedMaterial._uniforms;

        // Build the method definition
        var shaderSource = combinedMaterial._getShaderSource();
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

        // http://stackoverflow.com/questions/641407/javascript-negative-lookbehind-equivalent
        var replaceMaterialID = function (expandedMethod) {
            return function($0, $1) {
                return $1 ? $0 : expandedMethod;
            };
        };
        // Replace each material id with the expanded glsl method call for each component expression.
        for (var component in this.materialComponents) {
            if (this.materialComponents.hasOwnProperty(component)) {
                var expression = this.materialComponents[component];
                for (var i = 0; i < materialContainers.length; i++) {
                    var materialContainer = materialContainers[i];
                    var expandedMethod = materialContainer.methodName + '(materialInput)';
                    var replaceRegExp = new RegExp('([._a-zA-Z0-9])?' + materialContainer.id + '([^.])?', 'g');
                    expression = expression.replace(replaceRegExp, replaceMaterialID(expandedMethod));
                }
                shaderSource += 'material.' + component + ' = ' + expression + ';\n';
            }
        }
        shaderSource += 'return material;\n}\n';
        this._shaderSource = shaderSource;

        // Register composite material to factory if id is provided.
        if (typeof this.compositeMaterialID !== 'undefined') {
            this._materialFactory._compositeMaterials[this.compositeMaterialID] = t;
        }
    }

    // Convert all the material templates to materials.
    CompositeMaterial.prototype._constructMaterials = function() {
        var materialContainers = [];
        for (var materialID in this.materialTemplates) {
            if(this.materialTemplates.hasOwnProperty(materialID)) {
                // Create a unique method name.
                var materialTemplate = this.materialTemplates[materialID];
                var originalMethodName = (materialTemplate.type === 'BlendMap') ? 'agi_getBlendFactor' : 'agi_getMaterial';
                var guid = createGuid().replace(new RegExp('-', 'g'), '').slice(0,4);
                var newMethodName = originalMethodName + '_' + materialID + '_' + guid;

                // Register material with textures so it can be updated once the texture loads and
                // replace the textureID with a texture object.
                var materialTextureData = [];
                for (var materialProperty in materialTemplate) {
                    if (materialTemplate.hasOwnProperty(materialProperty)) {
                        var pathAttribution = '__path__';
                        var texturePath = this.textureTemplates[materialTemplate[materialProperty]] || materialTemplate[materialProperty + pathAttribution];
                        if (typeof texturePath !== 'undefined') {
                            materialTextureData.push({'property' : materialProperty, 'path' : texturePath});
                            materialTemplate[materialProperty + pathAttribution] = texturePath;
                            if (typeof materialTemplate[materialProperty]._texture === 'undefined') {
                                materialTemplate[materialProperty] = ((typeof texturePath) === 'string') ?
                                    this.context.getDefaultTexture() : this.context.getDefaultCubeMap();
                            }
                        }
                    }
                }
                // Construct material
                var material = this._materialFactory.constructMaterial(materialTemplate.type, materialTemplate);
                material._shaderSource = material._shaderSource.replace(new RegExp(originalMethodName, 'g'), newMethodName);
                materialContainers.push({'id' : materialID, 'material' : material, 'methodName' : newMethodName});
                this[materialID] = material;

                // Register textures to materials when they load.
                for (var i = 0; i < materialTextureData.length; i++) {
                    var data = materialTextureData[i];
                    this._texturePool.registerTextureToMaterial(material, data.property, data.path, this.context);
                }
            }
        }
        return materialContainers;
    };

    CompositeMaterial.prototype._texturePool = {
        _pathsToMaterials : {},
        _pathsToTextures : {},
        _getFullPath : function(texturePath) {
            var path = texturePath;
            if (typeof path !== 'string') {
                path = texturePath.positiveX + texturePath.negativeX +
                       texturePath.positiveY + texturePath.negativeY +
                       texturePath.positiveZ + texturePath.negativeZ;
            }
            return path;
        },
        registerTextureToMaterial : function(material, property, texturePath, context) {
            var that = this;
            var path = this._getFullPath(texturePath);
            var texture = this._pathsToTextures[path];
            if (typeof texture === 'undefined') {
                this._pathsToMaterials[path] = this._pathsToMaterials[path] || [];
                this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                if (this._pathsToMaterials[path].length === 1) {
                    if (typeof texturePath === 'string') {
                        // Load 2D texture
                        var image = new Image();
                        image.onload = function() {
                            texture = context.createTexture2D({source : image});
                            that._pathsToTextures[path] = texture;
                            var materialContainers = that._pathsToMaterials[path];
                            for (var i = 0; i < materialContainers.length; i++) {
                                var materialContainer = materialContainers[i];
                                materialContainer.material[materialContainer.property] = texture;
                            }
                        };
                        image.src = path;
                    }
                    else {
                        // Load cube map
                        Chain.run(
                            Jobs.downloadImage(texturePath.positiveX),
                            Jobs.downloadImage(texturePath.negativeX),
                            Jobs.downloadImage(texturePath.positiveY),
                            Jobs.downloadImage(texturePath.negativeY),
                            Jobs.downloadImage(texturePath.positiveZ),
                            Jobs.downloadImage(texturePath.negativeZ)
                        ).thenRun(function() {
                            texture = context.createCubeMap({
                                source : {
                                    positiveX : this.images[texturePath.positiveX],
                                    negativeX : this.images[texturePath.negativeX],
                                    positiveY : this.images[texturePath.positiveY],
                                    negativeY : this.images[texturePath.negativeY],
                                    positiveZ : this.images[texturePath.positiveZ],
                                    negativeZ : this.images[texturePath.negativeZ]
                                }
                            });
                            that._pathsToTextures[path] = texture;
                            var materialContainers = that._pathsToMaterials[path];
                            for (var i = 0; i < materialContainers.length; i++) {
                                var materialContainer = materialContainers[i];
                                materialContainer.material[materialContainer.property] = texture;
                            }
                        });
                    }
                }
            }
            else if(material[property] !== texture) {
                // Texture had already been created
                material[property] = texture;
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
                return new CompositeMaterial(undefined, this._compositeMaterials[name]);
            }
            else {
                throw new DeveloperError('Material with type ' + name + ' does not exist.');
            }
        }
    };

    CompositeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               this._shaderSource;
    };

    return CompositeMaterial;
});
