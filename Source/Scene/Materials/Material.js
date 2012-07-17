/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Core/createGuid',
        '../../Core/Jobs',
        '../../Core/clone',
        '../../ThirdParty/Chain',
        '../../Shaders/Materials/AlphaMapMaterial',
        '../../Shaders/Materials/AsphaltMaterial',
        '../../Shaders/Materials/BlobMaterial',
        '../../Shaders/Materials/BrickMaterial',
        '../../Shaders/Materials/BumpMapMaterial',
        '../../Shaders/Materials/CementMaterial',
        '../../Shaders/Materials/CheckerboardMaterial',
        '../../Shaders/Materials/ColorMaterial',
        '../../Shaders/Materials/DiffuseMapMaterial',
        '../../Shaders/Materials/DistanceIntervalMaterial',
        '../../Shaders/Materials/DotMaterial',
        '../../Shaders/Materials/EmissionMapMaterial',
        '../../Shaders/Materials/FacetMaterial',
        '../../Shaders/Materials/FresnelMaterial',
        '../../Shaders/Materials/GrassMaterial',
        '../../Shaders/Materials/HorizontalStripeMaterial',
        '../../Shaders/Materials/NormalMapMaterial',
        '../../Shaders/Materials/ReflectionMaterial',
        '../../Shaders/Materials/RefractionMaterial',
        '../../Shaders/Materials/SpecularMapMaterial',
        '../../Shaders/Materials/TieDyeMaterial',
        '../../Shaders/Materials/VerticalStripeMaterial',
        '../../Shaders/Materials/WoodMaterial'
    ], function(
        DeveloperError,
        createGuid,
        Jobs,
        clone,
        Chain,
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
     * @name Material
     * @constructor
     *
     * @example
     */

    function Material(description) {
        var that = this;
        this.description = description || {};
        this.context = this.description.context;
        this.strict = (typeof this.description.strict !== 'undefined') ? this.description.strict : true;
        this.template = this.description.template || {};
        this._materialID = this.template.id;

        // If the factory contains this material ID, build the material template off of the stored template.
        var isOldMaterialType = this._materialFactory.hasMaterial(this._materialID);
        if (isOldMaterialType) {
            var newMaterialTemplate = clone(this._materialFactory.getMaterial(this._materialID));
            this._extendObject(this.template, newMaterialTemplate);
        }

        // Once the template has been established, set the member variables.
        this._materialTextures = this.template.textures || {};
        this._materialUniforms = this.template.uniforms || {};
        this._materialTemplates = this.template.materials || {};
        this._materialComponents = this.template.components;
        this._materialSource = this.template.source;
        this._materialSourcePath = this.template.sourcePath;
        this._hasComponentSection = (typeof this._materialComponents !== 'undefined');
        this._hasSourceSection = (typeof this._materialSource !== 'undefined');
        this._hasSourcePathSection = (typeof this._materialSourcePath !== 'undefined');

        // Make sure the template has no obvious errors. More error checking happens later.
        this._checkForErrors();

        // If the material has a new ID, add it to the factory.
        var isNewMaterialType = (typeof this._materialID !== 'undefined') && (isOldMaterialType === false);
        if (isNewMaterialType){
            this._materialFactory.addMaterial(this._materialID, this.template);
        }

        // Build the shader source for the main material.
        this._shaderSource = '';
        if (this._hasSourceSection) {
            this._shaderSource += this._materialSource;
        }
        else if (this._hasSourcePathSection) {
            this._shaderSource += this._materialFactory.getShaderSource(this._materialSourcePath);
        }
        else {
            this._shaderSource += 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n';
            this._shaderSource += 'agi_material material = agi_getDefaultMaterial(materialInput);\n';
            this._shaderSource += 'return material;\n}\n';
        }
        if (this._hasComponentSection) {
            for (var component in this._materialComponents) {
                if (this._materialComponents.hasOwnProperty(component)) {
                    var expression = this._materialComponents[component];
                    if (expression.length > 0) {
                        var statement = 'material.' + component + ' = ' + expression + ';\n';
                        var indexOfReturn = this._shaderSource.indexOf('return material;');
                        var firstHalf = this._shaderSource.slice(0, indexOfReturn);
                        var secondHalf = this._shaderSource.slice(indexOfReturn, this._shaderSource.length);
                        this._shaderSource = firstHalf + statement + secondHalf;
                    }
                }
            }
        }

        // If the source contains a texture ID, create a uniform for it.
        for (var textureID in this._materialTextures) {
            if (this._materialTextures.hasOwnProperty(textureID)) {
                if (this._replaceToken(textureID, textureID, true) > 0) {
                    this._materialUniforms[textureID] = textureID;
                }
            }
        }

        // Set up uniforms for the main material
        this._uniforms = {};
        var newShaderSource = '';
        var returnUniform = function (uniformID) {
            return function() {
                return that[uniformID];
            };
        };
        for (var uniformID in this._materialUniforms) {
            if (this._materialUniforms.hasOwnProperty(uniformID)) {
                var uniformValue = this._materialUniforms[uniformID];
                var textureValue = this._materialTextures[uniformValue];
                uniformValue = textureValue || uniformValue;

                var uniformType = this._getUniformType(uniformValue);
                if (typeof uniformType === 'undefined') {
                    throw new DeveloperError('Invalid uniform type for \'' + uniformID + '\'.');
                }
                // When the uniform type is a string, replace all tokens with the uniformID with
                // the associated value. Do not make it an actual uniform.
                if (uniformType === 'string') {
                    if (this._replaceToken(uniformID, uniformValue, false) === 0 && this.strict) {
                        throw new DeveloperError('Shader source does not use string \'' + uniformID + '\'.');
                    }
                }
                else {
                    this[uniformID] = uniformValue;
                    var newUniformID = uniformID + '_' + this._getNewGUID();
                    this._uniforms[newUniformID] = returnUniform(uniformID);

                    // Add uniform declaration to source code.
                    var uniformPhrase = 'uniform ' + uniformType + ' ' + uniformID + ';\n';
                    if (this._shaderSource.indexOf(uniformPhrase) === -1) {
                        uniformPhrase = uniformPhrase.replace(uniformID, newUniformID);
                        newShaderSource += uniformPhrase;
                    }
                    // Replace uniform name with guid version.
                    if (this._replaceToken(uniformID, newUniformID, true) === 0 && this.strict) {
                        throw new DeveloperError('Shader source does not use uniform \'' + uniformID + '\'.');
                    }
                    // If uniform is a texture, load it.
                    if (uniformType === 'sampler2D' || uniformType === 'samplerCube') {
                        this[uniformID] = this._texturePool.registerTextureToMaterial(this, uniformID, uniformValue, uniformType);
                    }
                }
            }
        }
        this._shaderSource = newShaderSource + this._shaderSource;

        // Create all sub-materials and combine source and uniforms together.
        newShaderSource = '';
        for (var materialID in this._materialTemplates) {
            if (this._materialTemplates.hasOwnProperty(materialID)) {
                // Construct the sub-material. Share texture names using extendObject.
                var materialTemplate = this._materialTemplates[materialID];
                materialTemplate.textures = materialTemplate.textures || {};
                this._extendObject(materialTemplate.textures, this._materialTextures);
                var material = new Material({'context' : this.context, 'strict' : this.strict, 'template' : materialTemplate});

                // Make the material's agi_getMaterial unique by appending a guid.
                var originalMethodName = 'agi_getMaterial';
                var newMethodName = originalMethodName + '_' + this._getNewGUID();
                material._replaceToken(originalMethodName, newMethodName, true);
                this[materialID] = material;

                // Replace each material id with the expanded glsl method call for each component expression.
                // Example: material.diffuse = diffuseMap.diffuse
                // Becomes: material.diffuse = agi_getMaterial_{guid}(materialInput).diffuse
                var newMethodCall = newMethodName + '(materialInput)';
                if (this._replaceToken(materialID, newMethodCall, true) === 0 && this.strict) {
                    throw new DeveloperError('Shader source does not use material \'' + materialID + '\'.');
                }
                newShaderSource += '\n' + material._shaderSource;
                this._extendObject(this._uniforms, material._uniforms);
            }
        }
        this._shaderSource = newShaderSource + this._shaderSource;
    }

    Material.prototype._getNewGUID = function() {
        return createGuid().replace(new RegExp('-', 'g'), '').slice(0,5);
    };

    Material.prototype._extendObject = function(object1, object2) {
        var extend = function(object1, object2) {
            for (var property in object2) {
                if (object2.hasOwnProperty(property)) {
                    if (object1.hasOwnProperty(property) && (typeof object1[property] !== 'undefined')) {
                        if (typeof object1[property] === 'object' && typeof object2[property] === 'object') {
                            extend(object1[property], object2[property]);
                        }
                    }
                    else {
                        object1[property] = object2[property];
                    }
                }
            }
        };
        extend(object1, object2);
    };

    // Used for searching or replacing a token in the shader source with something else.
    // http://stackoverflow.com/questions/641407/javascript-negative-lookbehind-equivalent
    // If excludePeriod is true, do not accept tokens that are preceded by periods.
    Material.prototype._replaceToken = function(token, newToken, excludePeriod) {
        var count = 0;
        var replaceFunction = function (replace) {
            return function($0, $1, $2) {
                if ($1 || $2) {
                    return $0;
                }
                count += 1;
                return replace;
            };
        };

        var suffixChars = '([a-zA-Z0-9_])?';
        var prefixChars = excludePeriod ? '([a-zA-Z0-9._])?' : '([a-zA-Z0-9_])?';
        var regExp = new RegExp(prefixChars + token + suffixChars, 'g');
        this._shaderSource = this._shaderSource.replace(regExp, replaceFunction(newToken));
        return count;
    };

    Material.prototype._checkForErrors = function() {
        // Make sure there are no duplicate names
        var duplicateNames = {};
        var groups = {'uniforms' : this._materialUniforms, 'materials' : this._materialTemplates};
        for (var groupID in groups) {
            if (groups.hasOwnProperty(groupID)) {
                var groupValue = groups[groupID];
                if (typeof groupValue !== 'undefined') {
                    for (var id in groupValue) {
                        if (groupValue.hasOwnProperty(id)) {
                            var existingGroupID = duplicateNames[id];
                            if (typeof existingGroupID !== 'undefined') {
                                throw new DeveloperError('Duplicate identifier \'' + id + '\' found in \'' + groupID + '\' and \'' + existingGroupID + '\'.');
                            }
                            duplicateNames[id] = groupID;
                        }
                    }
                }
            }
        }

        if (this._hasSourceSection && this._hasSourcePathSection) {
            throw new DeveloperError('Cannot have source and sourcePath in the same template.');
        }

        //Make sure all the component types are valid
        duplicateNames = {};
        if (this._hasComponentSection) {
            var validComponentTypes = ['diffuse', 'specular', 'normal', 'emission', 'alpha'];
            for (var component in this._materialComponents) {
                if (this._materialComponents.hasOwnProperty(component)) {
                    var validComponent = false;
                    for (var i = 0; i < validComponentTypes.length; i++) {
                        if (validComponentTypes[i] === component) {
                            if (typeof duplicateNames[component] !== 'undefined') {
                                throw new DeveloperError('Duplicate component name \'' + component + '\'.');
                            }
                            duplicateNames[component] = true;
                            validComponent = true;
                            break;
                        }
                    }
                    if (validComponent === false) {
                        throw new DeveloperError('Component name \'' + component + '\' does not exist.');
                    }
                }
            }
        }
    };

    Material.prototype._getUniformType = function(uniform) {
        var uniformType = uniform.type;
        if (typeof uniformType === 'undefined') {
            var imageMatcher = new RegExp('^(.)+\\.(gif|jpg|jpeg|tiff|png)$', 'i');
            var type = typeof uniform;
            if (type === 'string') {
                if (imageMatcher.test(uniform)) {
                    uniformType = 'sampler2D';
                }
                else {
                    uniformType = 'string';
                }
            }
            else if (type === 'number') {
                uniformType = 'float';
            }
            else if (type === 'object') {
                var numAttributes = 0;
                for (var attribute in uniform) {
                    if (uniform.hasOwnProperty(attribute) && attribute !== 'type') {
                        numAttributes += 1;
                    }
                }
                if (numAttributes >= 2 && numAttributes <= 4) {
                    uniformType = 'vec' + numAttributes;
                }
                else if (numAttributes === 6) {
                    if (imageMatcher.test(uniform.positiveX) && imageMatcher.test(uniform.negativeX) &&
                        imageMatcher.test(uniform.positiveY) && imageMatcher.test(uniform.negativeY) &&
                        imageMatcher.test(uniform.positiveZ) && imageMatcher.test(uniform.negativeZ)) {
                        uniformType = 'samplerCube';
                    }
                }
            }
        }
        return uniformType;
    };

    Material.prototype._texturePool = {
        _pathsToMaterials : {},
        _pathsToTextures : {},
        _updateMaterialsOnTextureLoad : function(texture, path) {
            this._pathsToTextures[path] = texture;
            var materialContainers = this._pathsToMaterials[path];
            for (var i = 0; i < materialContainers.length; i++) {
                var materialContainer = materialContainers[i];
                var material = materialContainer.material;
                var property = materialContainer.property;
                material[property] = texture;
            }
        },
        registerTextureToMaterial : function(material, property, texturePath, textureType) {
            var that = this;
            var path;
            var texture;
            if (textureType === 'sampler2D') {
                path = texturePath;
                texture = this._pathsToTextures[path];
                if (typeof texture === 'undefined') {
                    texture = material.context.getDefaultTexture();
                    this._pathsToMaterials[path] = this._pathsToMaterials[path] || [];
                    this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                    if (this._pathsToMaterials[path].length === 1) {
                        Chain.run(
                            Jobs.downloadImage(texturePath)
                        ).thenRun(function() {
                            texture = material.context.createTexture2D({source : this.images[texturePath]});
                            that._updateMaterialsOnTextureLoad(texture, path);
                        });
                    }
                }
            }
            else if (textureType === 'samplerCube') {
                path = texturePath.positiveX + texturePath.negativeX +
                       texturePath.positiveY + texturePath.negativeY +
                       texturePath.positiveZ + texturePath.negativeZ;
                texture = this._pathsToTextures[path];
                if (typeof texture === 'undefined') {
                    texture = material.context.getDefaultCubeMap();
                    this._pathsToMaterials[path] = this._pathsToMaterials[path] || [];
                    this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                    if (this._pathsToMaterials[path].length === 1) {
                        Chain.run(
                            Jobs.downloadImage(texturePath.positiveX),
                            Jobs.downloadImage(texturePath.negativeX),
                            Jobs.downloadImage(texturePath.positiveY),
                            Jobs.downloadImage(texturePath.negativeY),
                            Jobs.downloadImage(texturePath.positiveZ),
                            Jobs.downloadImage(texturePath.negativeZ)
                        ).thenRun(function() {
                            texture = material.context.createCubeMap({
                                source : {
                                    positiveX : this.images[texturePath.positiveX],
                                    negativeX : this.images[texturePath.negativeX],
                                    positiveY : this.images[texturePath.positiveY],
                                    negativeY : this.images[texturePath.negativeY],
                                    positiveZ : this.images[texturePath.positiveZ],
                                    negativeZ : this.images[texturePath.negativeZ]
                                }
                            });
                            that._updateMaterialsOnTextureLoad(texture, path);
                        });
                    }
                }
            }
            return texture;
        }
    };

    Material.prototype._materialFactory = {
        _shaders : {
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
        _materials : {},
        getShaderSource : function(name) {
            return this._shaders[name];
        },
        hasMaterial : function (materialID) {
            return (typeof this.getMaterial(materialID) !== 'undefined');
        },
        addMaterial : function (materialID, materialTemplate) {
            this._materials[materialID] = materialTemplate;
        },
        getMaterial : function (materialID) {
            return this._materials[materialID];
        }
    };

    Material.prototype._getShaderSource = function() {
        return this._shaderSource;
    };

    // Create generic material types

    // Color Material
    Material.prototype._materialFactory.addMaterial('ColorMaterial', {
        'id' : 'ColorMaterial',
        'uniforms' : {
            'u_color' : {
                'red' : 1,
                'green' : 0,
                'blue' : 0,
                'alpha' : 1
            }
        },
        'sourcePath' : 'ColorMaterial'
    });

    // Diffuse Map Material
    Material.prototype._materialFactory.addMaterial('DiffuseMapMaterial', {
        'id' : 'DiffuseMapMaterial',
        'uniforms' : {
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            },
            'u_texture' : '../../Images/Cesium_Logo_Color.jpg',
            'diffuseChannels' : 'rgb',
            'alphaChannel' : 'a'
        },
        'sourcePath' : 'DiffuseMapMaterial'
    });

    // Alpha Map Material
    Material.prototype._materialFactory.addMaterial('AlphaMapMaterial', {
        'id' : 'AlphaMapMaterial',
        'uniforms' : {
            'u_texture' : '../../Images/alpha_map.png',
            'alphaChannel' : 'r',
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'sourcePath' : 'AlphaMapMaterial'
    });

    // Specular Map Material
    Material.prototype._materialFactory.addMaterial('SpecularMapMaterial' , {
        'id' : 'SpecularMapMaterial',
        'uniforms' : {
            'u_texture' : '../../Images/alpha_map.png',
            'specularChannel' : 'r',
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'sourcePath' : 'SpecularMapMaterial'
    });

    // Emission Map Material
    Material.prototype._materialFactory.addMaterial('EmissionMapMaterial' , {
        'id' : 'EmissionMapMaterial',
        'uniforms' : {
            'u_texture' : '../../Images/alpha_map.png',
            'emissionChannels' : 'rgb',
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'sourcePath' : 'EmissionMapMaterial'
    });

    // Bump Map Material
    Material.prototype._materialFactory.addMaterial('BumpMapMaterial' , {
        'id' : 'BumpMapMaterial',
        'uniforms' : {
            'u_texture' : '../../Images/earthbump1k.jpg',
            'bumpMapChannels' : 'r',
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'sourcePath' : 'BumpMapMaterial'
    });

    // Normal Map Material
    Material.prototype._materialFactory.addMaterial('NormalMapMaterial', {
        'id' : 'NormalMapMaterial',
        'uniforms' : {
            'u_texture' : '../../Images/earthnormalmap.jpg',
            'normalMapChannels' : 'rgb',
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'sourcePath' : 'NormalMapMaterial'
    });

    // Reflection Material
    Material.prototype._materialFactory.addMaterial('ReflectionMaterial', {
        'id' : 'ReflectionMaterial',
        'uniforms' : {
            'u_cubeMap' : {
                'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
            },
            'reflectionChannels' : 'rgb'
        },
        'sourcePath' : 'ReflectionMaterial'
    });

    // Refraction Material
    Material.prototype._materialFactory.addMaterial('RefractionMaterial', {
        'id' : 'RefractionMaterial',
        'uniforms' : {
            'u_cubeMap' : {
                'positiveX' : '../../Images/PalmTreesCubeMap/posx.jpg',
                'negativeX' : '../../Images/PalmTreesCubeMap/negx.jpg',
                'positiveY' : '../../Images/PalmTreesCubeMap/negy.jpg',
                'negativeY' : '../../Images/PalmTreesCubeMap/posy.jpg',
                'positiveZ' : '../../Images/PalmTreesCubeMap/posz.jpg',
                'negativeZ' : '../../Images/PalmTreesCubeMap/negz.jpg'
            },
            'refractionChannels' : 'rgb',
            'u_indexOfRefractionRatio' : 0.9
        },
        'sourcePath' : 'RefractionMaterial'
    });

    // Fresnel Material
    Material.prototype._materialFactory.addMaterial('FresnelMaterial' , {
        'id' : 'FresnelMaterial',
        'materials' : {
            'reflection' : {
                'id' : 'ReflectionMaterial'
            },
            'refraction' : {
                'id' : 'RefractionMaterial'
            }
        },
        'sourcePath' : 'FresnelMaterial'
    });

    // Brick Material
    Material.prototype._materialFactory.addMaterial('BrickMaterial', {
        'id' : 'BrickMaterial',
        'uniforms' : {
            'u_brickColor' : {
                'red': 0.6,
                'green': 0.3,
                'blue': 0.1,
                'alpha': 1.0
            },
            'u_mortarColor' : {
                'red' : 0.8,
                'green' : 0.8,
                'blue' : 0.7,
                'alpha' : 1.0
            },
            'u_brickSize' : {
                'x' : 0.30,
                'y' : 0.15
            },
            'u_brickPct' : {
                'x' : 0.90,
                'y' : 0.85
            },
            'u_brickRoughness' : 0.2,
            'u_mortarRoughness' : 0.1
        },
        'sourcePath' : 'BrickMaterial'
    });

    // Wood Material
    Material.prototype._materialFactory.addMaterial('WoodMaterial', {
        'id' : 'WoodMaterial',
        'uniforms' : {
            'u_lightWoodColor' : {
                'red' : 0.6,
                'green' : 0.3,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'u_darkWoodColor' : {
                'red' : 0.4,
                'green' : 0.2,
                'blue' : 0.07,
                'alpha' : 1.0
            },
            'u_ringFrequency' : 3.0,
            'u_noiseScale' : {
                'x' : 0.7,
                'y' : 0.5
            },
            'u_grainFrequency' : 27.0
        },
        'sourcePath' : 'WoodMaterial'
    });

    // Asphalt Material
    Material.prototype._materialFactory.addMaterial('AsphaltMaterial', {
        'id' : 'AsphaltMaterial',
        'uniforms' : {
            'u_asphaltColor' : {
                'red' : 0.15,
                'green' : 0.15,
                'blue' : 0.15,
                'alpha' : 1.0
            },
            'u_bumpSize' : 0.02,
            'u_roughness' : 0.2
        },
        'sourcePath' : 'AsphaltMaterial'
    });

    // Cement Material
    Material.prototype._materialFactory.addMaterial('CementMaterial', {
        'id' : 'CementMaterial',
        'uniforms' : {
            'u_cementColor' : {
                'red' : 0.95,
                'green' : 0.95,
                'blue' : 0.85,
                'alpha' : 1.0
            },
            'u_grainScale' : 0.01,
            'u_roughness' : 0.3
        },
        'sourcePath' : 'CementMaterial'
    });

    // Grass Material
    Material.prototype._materialFactory.addMaterial('GrassMaterial', {
        'id' : 'GrassMaterial',
        'uniforms' : {
            'u_grassColor' : {
                'red' : 0.25,
                'green' : 0.4,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'u_dirtColor' : {
                'red' : 0.1,
                'green' : 0.1,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'u_patchiness' : 1.5
        },
        'sourcePath' : 'GrassMaterial'
    });

    // Horizontal Stripe Material
    Material.prototype._materialFactory.addMaterial('HorizontalStripeMaterial', {
        'id' : 'HorizontalStripeMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_offset' : 0.0,
            'u_repeat' : 5.0
        },
        'sourcePath' : 'HorizontalStripeMaterial'
    });

    // Vertical Stripe Material
    Material.prototype._materialFactory.addMaterial('VerticalStripeMaterial', {
        'id' : 'VerticalStripeMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_offset' : 0.0,
            'u_repeat' : 5.0
        },
        'sourcePath' : 'VerticalStripeMaterial'
    });

    // Checkerboard Material
    Material.prototype._materialFactory.addMaterial('CheckerboardMaterial', {
        'id' : 'CheckerboardMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'u_darkColor' : {
                'red' : 0.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.75
            },
            'u_repeat' : {
                'x' : 5.0,
                'y' : 5.0
            }
        },
        'sourcePath' : 'CheckerboardMaterial'
    });

    // Dot Material
    Material.prototype._materialFactory.addMaterial('DotMaterial', {
        'id' : 'DotMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'u_darkColor' : {
                'red' : 0.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.75
            },
            'u_repeat' : {
                'x' : 5.0,
                'y' : 5.0
            }
        },
        'sourcePath' : 'DotMaterial'
    });

    // Tie-Dye Material
    Material.prototype._materialFactory.addMaterial('TieDyeMaterial', {
        'id' : 'TieDyeMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'u_darkColor' : {
                'red' : 1.0,
                'green' : 0.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'u_frequency' : 5.0
        },
        'sourcePath' : 'TieDyeMaterial'
    });

    // Facet Material
    Material.prototype._materialFactory.addMaterial('FacetMaterial', {
        'id' : 'FacetMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 0.25,
                'green' : 0.25,
                'blue' : 0.25,
                'alpha' : 0.75
            },
            'u_darkColor' : {
                'red' : 0.75,
                'green' : 0.75,
                'blue' : 0.75,
                'alpha' : 0.75
            },
            'u_frequency' : 10.0
        },
        'sourcePath' : 'FacetMaterial'
    });

    // Blob Material
    Material.prototype._materialFactory.addMaterial('BlobMaterial', {
        'id' : 'BlobMaterial',
        'uniforms' : {
            'u_lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'u_frequency' : 10.0
        },
        'sourcePath' : 'BlobMaterial'
    });

    return Material;
});
