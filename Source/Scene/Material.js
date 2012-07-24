/*global define*/
define([
        '../ThirdParty/when',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/createGuid',
        '../Core/clone',
        '../Core/Color',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Renderer/Texture',
        '../Renderer/CubeMap',
        '../Shaders/Materials/AlphaMapMaterial',
        '../Shaders/Materials/AsphaltMaterial',
        '../Shaders/Materials/BlobMaterial',
        '../Shaders/Materials/BrickMaterial',
        '../Shaders/Materials/BumpMapMaterial',
        '../Shaders/Materials/CementMaterial',
        '../Shaders/Materials/CheckerboardMaterial',
        '../Shaders/Materials/ColorMaterial',
        '../Shaders/Materials/DiffuseMapMaterial',
        '../Shaders/Materials/DistanceIntervalMaterial',
        '../Shaders/Materials/DotMaterial',
        '../Shaders/Materials/EmissionMapMaterial',
        '../Shaders/Materials/FacetMaterial',
        '../Shaders/Materials/FresnelMaterial',
        '../Shaders/Materials/GrassMaterial',
        '../Shaders/Materials/HorizontalStripeMaterial',
        '../Shaders/Materials/ImageMaterial',
        '../Shaders/Materials/NormalMapMaterial',
        '../Shaders/Materials/ReflectionMaterial',
        '../Shaders/Materials/RefractionMaterial',
        '../Shaders/Materials/SpecularMapMaterial',
        '../Shaders/Materials/TieDyeMaterial',
        '../Shaders/Materials/VerticalStripeMaterial',
        '../Shaders/Materials/WoodMaterial'
    ], function(
        when,
        loadImage,
        DeveloperError,
        createGuid,
        clone,
        Color,
        Matrix2,
        Matrix3,
        Matrix4,
        Texture,
        CubeMap,
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
        ImageMaterial,
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
     * @example
     */

    function Material(description) {
        var that = this;
        this._description = description || {};
        this._context = this._description.context;
        this._strict = (typeof this._description.strict !== 'undefined') ? this._description.strict : false;
        this._template = this._description.fabric || {};
        this._materialID = this._template.id;

        // If the factory contains this material ID, build the material template off of the stored template.
        var isOldMaterialType = this._materialFactory.hasMaterial(this._materialID);
        if (isOldMaterialType) {
            var newMaterialTemplate = clone(this._materialFactory.getMaterial(this._materialID));
            this._extendObject(this._template, newMaterialTemplate);
        }

        // Once the template has been established, set the member variables.
        this._materialUniforms = this._template.uniforms || {};
        this._materialTemplates = this._template.materials || {};
        this._materialComponents = this._template.components;
        this._materialSource = this._template.source;
        this._hasComponentsSection = (typeof this._materialComponents !== 'undefined');
        this._hasSourceSection = (typeof this._materialSource !== 'undefined');

        // Make sure the template has no obvious errors. More error checking happens later.
        this._checkForTemplateErrors();

        // If the material has a new ID, add it to the factory.
        var isNewMaterialType = (isOldMaterialType === false) && (typeof this._materialID !== 'undefined');
        if (isNewMaterialType){
            this._materialFactory.addMaterial(this._materialID, this._template);
        }

        // Build the shader source for the main material.
        this._shaderSource = '';
        if (this._hasSourceSection) {
            this._shaderSource += this._materialSource;
        }
        else {
            this._shaderSource += 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n';
            this._shaderSource += 'agi_material material = agi_getDefaultMaterial(materialInput);\n';
            if (this._hasComponentsSection) {
                for (var component in this._materialComponents) {
                    if (this._materialComponents.hasOwnProperty(component)) {
                        var expression = this._materialComponents[component];
                        var statement = 'material.' + component + ' = ' + expression + ';\n';
                        this._shaderSource += statement;
                    }
                }
            }
            this._shaderSource += 'return material;\n}\n';
        }


        // Set up uniforms for the main material
        this._uniforms = {};

        // Determines the uniform type based on the uniform in the template.
        var getUniformType = function(uniformValue) {
            var uniformType = uniformValue.type;
            if (typeof uniformType === 'undefined') {
                var imageMatcher = new RegExp('^((data:)|((.)+\\.(gif|jpg|jpeg|tiff|png)$))', 'i');
                var type = typeof uniformValue;
                if (type === 'string') {
                    if (uniformValue === 'agi_defaultCubeMap') {
                        uniformType = 'samplerCube';
                    }
                    else if (imageMatcher.test(uniformValue) || uniformValue === 'agi_defaultTexture') {
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
                    if (uniformValue instanceof Array) {
                        if (uniformValue.length === 4 || uniformValue.length === 9 || uniformValue.length === 16) {
                            var dimension = Math.sqrt(uniformValue.length);
                            uniformType = 'mat' + dimension;
                        }
                    }
                    else {
                        var numAttributes = 0;
                        for (var attribute in uniformValue) {
                            if (uniformValue.hasOwnProperty(attribute)) {
                                numAttributes += 1;
                            }
                        }
                        if (numAttributes >= 2 && numAttributes <= 4) {
                            uniformType = 'vec' + numAttributes;
                        }
                        else if (numAttributes === 6) {
                            if (imageMatcher.test(uniformValue.positiveX) && imageMatcher.test(uniformValue.negativeX) &&
                                imageMatcher.test(uniformValue.positiveY) && imageMatcher.test(uniformValue.negativeY) &&
                                imageMatcher.test(uniformValue.positiveZ) && imageMatcher.test(uniformValue.negativeZ)) {
                                uniformType = 'samplerCube';
                            }
                        }
                    }
                }
            }
            return uniformType;
        };

        // Writes uniform declarations to the shader file and connects uniform values with
        // corresponding material properties through the returnUniforms function.
        var processUniform = function(uniformID) {
            var uniformValue = that._materialUniforms[uniformID];
            var uniformType = getUniformType(uniformValue);
            if (typeof uniformType === 'undefined') {
                throw new DeveloperError('Invalid uniform \'' + uniformID + '\'.');
            }
            else if (uniformType === 'string') {
                if (that._replaceToken(uniformID, uniformValue, false) === 0 && that._strict) {
                    throw new DeveloperError('Shader source does not use string \'' + uniformID + '\'.');
                }
            }
            else {
                // If uniform type is a texture, add texture dimension uniforms.
                if (uniformType.indexOf('sampler') !== -1) {
                    if (typeof that._context === 'undefined') {
                        throw new DeveloperError('Context is not defined');
                    }
                    var textureDimensionsUniformName = uniformID + 'Dimensions';
                    if (that._shaderSource.indexOf(textureDimensionsUniformName) !== -1) {
                        that._materialUniforms[textureDimensionsUniformName] = {'type' : 'ivec2', 'x' : 1, 'y' : 1};
                        processUniform(textureDimensionsUniformName);
                    }
                }
                // Add uniform declaration to source code.
                var uniformPhrase = 'uniform ' + uniformType + ' ' + uniformID + ';\n';
                if (that._shaderSource.indexOf(uniformPhrase) === -1) {
                    that._shaderSource = uniformPhrase + that._shaderSource;
                }
                // Replace uniform name with guid version.
                var newUniformID = uniformID + '_' + that._getNewGUID();
                if (that._replaceToken(uniformID, newUniformID, true) === 1 && that._strict) {
                    throw new DeveloperError('Shader source does not use uniform \'' + uniformID + '\'.');
                }
                // Set uniform value
                that[uniformID] = uniformValue;
                that._uniforms[newUniformID] = returnUniform(uniformID, uniformType);
            }
        };
        // Checks for updates to material values to refresh the uniforms.
        var returnUniform = function (uniformID, uniformType) {
            return function() {
                var uniformValue = that[uniformID];
                if (uniformType.indexOf('sampler') !== -1 && !(uniformValue instanceof Texture || uniformValue instanceof CubeMap)) {
                    uniformValue = that._texturePool.registerTextureToMaterial(that, uniformID, uniformValue, uniformType);
                }
                else if (uniformType.indexOf('mat2') !== -1 && !(uniformValue instanceof Matrix2)) {
                    uniformValue = new Matrix2(uniformValue);
                }
                else if (uniformType.indexOf('mat3') !== -1 && !(uniformValue instanceof Matrix3)) {
                    uniformValue = new Matrix3(uniformValue);
                }
                else if (uniformType.indexOf('mat4') !== -1 && !(uniformValue instanceof Matrix4)) {
                    uniformValue = new Matrix4(uniformValue);
                }
                else if (uniformType === 'ivec2') {
                    var textureDimensionsIndex = uniformID.indexOf('Dimensions');
                    var texture = that[uniformID.slice(0, textureDimensionsIndex)];
                    if (textureDimensionsIndex !== -1 && typeof texture !== 'undefined') {
                        if (texture instanceof Texture) {
                            uniformValue.x = texture._width;
                            uniformValue.y = texture._height;
                        }
                        else if (texture instanceof CubeMap) {
                            uniformValue.x = texture._size;
                            uniformValue.y = texture._size;
                        }
                    }
                }
                that[uniformID] = uniformValue;
                return that[uniformID];
            };
        };
        // Process all uniforms in the template
        for (var uniformID in this._materialUniforms) {
            if (this._materialUniforms.hasOwnProperty(uniformID)) {
                processUniform(uniformID);
            }
        }

        // Create all sub-materials and combine source and uniforms together.
        var newShaderSource = '';
        for (var materialID in this._materialTemplates) {
            if (this._materialTemplates.hasOwnProperty(materialID)) {
                // Construct the sub-material. Share texture names using extendObject.
                var materialTemplate = this._materialTemplates[materialID];
                var material = new Material({'context' : this._context, 'strict' : this._strict, 'fabric' : materialTemplate});
                this._extendObject(this._uniforms, material._uniforms);
                this[materialID] = material;

                // Make the material's agi_getMaterial unique by appending a guid.
                var originalMethodName = 'agi_getMaterial';
                var newMethodName = originalMethodName + '_' + this._getNewGUID();
                material._replaceToken(originalMethodName, newMethodName, true);
                newShaderSource += material._shaderSource + '\n';

                // Replace each material id with an agi_getMaterial method call.
                var materialMethodCall = newMethodName + '(materialInput)';
                if (this._replaceToken(materialID, materialMethodCall, true) === 0 && this._strict) {
                    throw new DeveloperError('Shader source does not use material \'' + materialID + '\'.');
                }
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

    Material.prototype._checkForTemplateErrors = function() {
        // Make sure source and components do not exist in the same template.
        if (this._hasSourceSection && this._hasComponentsSection) {
            throw new DeveloperError('Cannot have source and components in the same template.');
        }
        // Make sure there are no duplicate names
        var duplicateNames = {};
        var groups = {'uniforms' : this._materialUniforms, 'materials' : this._materialTemplates};
        for (var groupID in groups) {
            if (groups.hasOwnProperty(groupID)) {
                var groupValue = groups[groupID];
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
        //Make sure all the component types are valid
        if (this._hasComponentsSection) {
            duplicateNames = {};
            var validComponentTypes = ['diffuse', 'specular', 'normal', 'emission', 'alpha'];
            for (var component in this._materialComponents) {
                if (this._materialComponents.hasOwnProperty(component)) {
                    var validComponent = false;
                    for (var i = 0; i < validComponentTypes.length; i++) {
                        if (component === validComponentTypes[i]) {
                            if (typeof duplicateNames[component] !== 'undefined') {
                                throw new DeveloperError('Duplicate component name \'' + component + '\'.');
                            }
                            duplicateNames[component] = true;
                            validComponent = true;
                            break;
                        }
                    }
                    if (validComponent === false) {
                        throw new DeveloperError('Component name \'' + component + '\' is not valid.');
                    }
                }
            }
        }
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
        registerTextureToMaterial : function(material, property, textureInfo, textureType) {
            var that = this;
            var path;
            var texture;
            if (textureType === 'sampler2D') {
                path = textureInfo;
                texture = this._pathsToTextures[path];
                if (typeof texture === 'undefined') {
                    texture = (material[property] instanceof Texture) ? material[property] : material._context.getDefaultTexture();
                    if (textureInfo !== 'agi_defaultTexture') {
                        this._pathsToMaterials[path] = this._pathsToMaterials[path] || [];
                        this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                        if (this._pathsToMaterials[path].length === 1) {
                            when(loadImage(path), function(image) {
                                texture = material._context.createTexture2D({source : image});
                                that._updateMaterialsOnTextureLoad(texture, path);
                            }, function() {
                                throw new DeveloperError('Texture image not found \'' + path + '\'.');
                            });
                        }
                    }
                }
            }
            else if (textureType === 'samplerCube') {
                path = textureInfo.positiveX + textureInfo.negativeX +
                       textureInfo.positiveY + textureInfo.negativeY +
                       textureInfo.positiveZ + textureInfo.negativeZ;
                texture = this._pathsToTextures[path];
                if (typeof texture === 'undefined') {
                    texture = (material[property] instanceof CubeMap) ? material[property] : material._context.getDefaultCubeMap();
                    if (textureInfo !== 'agi_defaultCubeMap') {
                        this._pathsToMaterials[path] = this._pathsToMaterials[path] || [];
                        this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                        if (this._pathsToMaterials[path].length === 1) {
                            when.all([loadImage(textureInfo.positiveX), loadImage(textureInfo.negativeX),
                                      loadImage(textureInfo.positiveY), loadImage(textureInfo.negativeY),
                                      loadImage(textureInfo.positiveZ), loadImage(textureInfo.negativeZ)])
                                      .then(function(images) {
                                texture = material._context.createCubeMap({
                                    source : {
                                        positiveX : images[0], negativeX : images[1],
                                        positiveY : images[2], negativeY : images[3],
                                        positiveZ : images[4], negativeZ : images[5]
                                    }
                                });
                                that._updateMaterialsOnTextureLoad(texture, path);
                            });
                        }
                    }
                }
            }
            return texture;
        }
    };

    Material.prototype._materialFactory = {
        _materials : {},
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
    Material.prototype.getShaderSource = function() {
        return this._shaderSource;
    };
    Material.prototype.getID = function() {
        return this._materialID;
    };

    // Create basic material types
    Material.fromID = function(context, materialID) {
        return new Material({
            context : context,
            fabric : {
                "id" : materialID
            }
        });
    };

    // Color Material
    Material.prototype._materialFactory.addMaterial('ColorMaterial', {
        'id' : 'ColorMaterial',
        'uniforms' : {
            'color' : new Color(1.0, 0.0, 0.0, 1.0)
        },
        'source' : ColorMaterial
    });

    // Image Material.
    // Useful for textures with an alpha component.
    Material.prototype._materialFactory.addMaterial('ImageMaterial', {
        'id' : 'ImageMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : ImageMaterial
    });

    // Diffuse Map Material
    Material.prototype._materialFactory.addMaterial('DiffuseMapMaterial', {
        'id' : 'DiffuseMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channels' : 'rgb',
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : DiffuseMapMaterial
    });

    // Alpha Map Material
    Material.prototype._materialFactory.addMaterial('AlphaMapMaterial', {
        'id' : 'AlphaMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channel' : 'a',
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : AlphaMapMaterial
    });

    // Specular Map Material
    Material.prototype._materialFactory.addMaterial('SpecularMapMaterial' , {
        'id' : 'SpecularMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channel' : 'r',
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : SpecularMapMaterial
    });

    // Emission Map Material
    Material.prototype._materialFactory.addMaterial('EmissionMapMaterial' , {
        'id' : 'EmissionMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channels' : 'rgb',
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : EmissionMapMaterial
    });

    // Bump Map Material
    Material.prototype._materialFactory.addMaterial('BumpMapMaterial' , {
        'id' : 'BumpMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channel' : 'r',
            'strength' : 0.8,
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : BumpMapMaterial
    });

    // Normal Map Material
    Material.prototype._materialFactory.addMaterial('NormalMapMaterial', {
        'id' : 'NormalMapMaterial',
        'uniforms' : {
            'texture' : 'agi_defaultTexture',
            'channels' : 'rgb',
            'strength' : 0.8,
            'repeat' : {
                'x' : 1,
                'y' : 1
            }
        },
        'source' : NormalMapMaterial
    });

    // Reflection Material
    Material.prototype._materialFactory.addMaterial('ReflectionMaterial', {
        'id' : 'ReflectionMaterial',
        'uniforms' : {
            'cubeMap' : 'agi_defaultCubeMap',
            'channels' : 'rgb'
        },
        'source' : ReflectionMaterial
    });

    // Refraction Material
    Material.prototype._materialFactory.addMaterial('RefractionMaterial', {
        'id' : 'RefractionMaterial',
        'uniforms' : {
            'cubeMap' : 'agi_defaultCubeMap',
            'channels' : 'rgb',
            'indexOfRefractionRatio' : 0.9
        },
        'source' : RefractionMaterial
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
        'source' : FresnelMaterial
    });

    // Brick Material
    Material.prototype._materialFactory.addMaterial('BrickMaterial', {
        'id' : 'BrickMaterial',
        'uniforms' : {
            'brickColor' : {
                'red': 0.6,
                'green': 0.3,
                'blue': 0.1,
                'alpha': 1.0
            },
            'mortarColor' : {
                'red' : 0.8,
                'green' : 0.8,
                'blue' : 0.7,
                'alpha' : 1.0
            },
            'brickSize' : {
                'x' : 0.30,
                'y' : 0.15
            },
            'brickPct' : {
                'x' : 0.90,
                'y' : 0.85
            },
            'brickRoughness' : 0.2,
            'mortarRoughness' : 0.1
        },
        'source' : BrickMaterial
    });

    // Wood Material
    Material.prototype._materialFactory.addMaterial('WoodMaterial', {
        'id' : 'WoodMaterial',
        'uniforms' : {
            'lightWoodColor' : {
                'red' : 0.6,
                'green' : 0.3,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'darkWoodColor' : {
                'red' : 0.4,
                'green' : 0.2,
                'blue' : 0.07,
                'alpha' : 1.0
            },
            'ringFrequency' : 3.0,
            'noiseScale' : {
                'x' : 0.7,
                'y' : 0.5
            },
            'grainFrequency' : 27.0
        },
        'source' : WoodMaterial
    });

    // Asphalt Material
    Material.prototype._materialFactory.addMaterial('AsphaltMaterial', {
        'id' : 'AsphaltMaterial',
        'uniforms' : {
            'asphaltColor' : {
                'red' : 0.15,
                'green' : 0.15,
                'blue' : 0.15,
                'alpha' : 1.0
            },
            'bumpSize' : 0.02,
            'roughness' : 0.2
        },
        'source' : AsphaltMaterial
    });

    // Cement Material
    Material.prototype._materialFactory.addMaterial('CementMaterial', {
        'id' : 'CementMaterial',
        'uniforms' : {
            'cementColor' : {
                'red' : 0.95,
                'green' : 0.95,
                'blue' : 0.85,
                'alpha' : 1.0
            },
            'grainScale' : 0.01,
            'roughness' : 0.3
        },
        'source' : CementMaterial
    });

    // Grass Material
    Material.prototype._materialFactory.addMaterial('GrassMaterial', {
        'id' : 'GrassMaterial',
        'uniforms' : {
            'grassColor' : {
                'red' : 0.25,
                'green' : 0.4,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'dirtColor' : {
                'red' : 0.1,
                'green' : 0.1,
                'blue' : 0.1,
                'alpha' : 1.0
            },
            'patchiness' : 1.5
        },
        'source' : GrassMaterial
    });

    // Horizontal Stripe Material
    Material.prototype._materialFactory.addMaterial('HorizontalStripeMaterial', {
        'id' : 'HorizontalStripeMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'offset' : 0.0,
            'repeat' : 5.0
        },
        'source' : HorizontalStripeMaterial
    });

    // Vertical Stripe Material
    Material.prototype._materialFactory.addMaterial('VerticalStripeMaterial', {
        'id' : 'VerticalStripeMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'offset' : 0.0,
            'repeat' : 5.0
        },
        'source' : VerticalStripeMaterial
    });

    // Checkerboard Material
    Material.prototype._materialFactory.addMaterial('CheckerboardMaterial', {
        'id' : 'CheckerboardMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 0.0,
                'alpha' : 0.5
            },
            'repeat' : {
                'x' : 5.0,
                'y' : 5.0
            }
        },
        'source' : CheckerboardMaterial
    });

    // Dot Material
    Material.prototype._materialFactory.addMaterial('DotMaterial', {
        'id' : 'DotMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'darkColor' : {
                'red' : 0.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.75
            },
            'repeat' : {
                'x' : 5.0,
                'y' : 5.0
            }
        },
        'source' : DotMaterial
    });

    // Tie-Dye Material
    Material.prototype._materialFactory.addMaterial('TieDyeMaterial', {
        'id' : 'TieDyeMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'darkColor' : {
                'red' : 1.0,
                'green' : 0.0,
                'blue' : 0.0,
                'alpha' : 0.75
            },
            'frequency' : 5.0
        },
        'source' : TieDyeMaterial
    });

    // Facet Material
    Material.prototype._materialFactory.addMaterial('FacetMaterial', {
        'id' : 'FacetMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 0.25,
                'green' : 0.25,
                'blue' : 0.25,
                'alpha' : 0.75
            },
            'darkColor' : {
                'red' : 0.75,
                'green' : 0.75,
                'blue' : 0.75,
                'alpha' : 0.75
            },
            'frequency' : 10.0
        },
        'source' : FacetMaterial
    });

    // Blob Material
    Material.prototype._materialFactory.addMaterial('BlobMaterial', {
        'id' : 'BlobMaterial',
        'uniforms' : {
            'lightColor' : {
                'red' : 1.0,
                'green' : 1.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'darkColor' : {
                'red' : 0.0,
                'green' : 0.0,
                'blue' : 1.0,
                'alpha' : 0.5
            },
            'frequency' : 10.0
        },
        'source' : BlobMaterial
    });

    return Material;
});
