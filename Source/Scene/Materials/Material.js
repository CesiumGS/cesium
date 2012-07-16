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
        this.template = this.description.template || {};
        this._materialID = this.template.id;

        // If the factory contains this material ID, build the material template off of the stored template.
        var isOldMaterialType = this._materialFactory.hasMaterial(this._materialID);
        if (isOldMaterialType) {
            var newMaterialTemplate = clone(this._materialFactory.getMaterial(this._materialID));
            this._extendTemplate(this.template, newMaterialTemplate);
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

        // Make sure the template has no obvious errors.
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
            if (this._hasComponentSection) {
                for (var component in this._materialComponents) {
                    if (this._materialComponents.hasOwnProperty(component)) {
                        var expression = this._materialComponents[component];
                        if (expression.length > 0) {
                            this._shaderSource += 'material.' + component + ' = ' + expression + ';\n';
                        }
                    }
                }
            }
            this._shaderSource += 'return material;\n}\n';
        }

        // If the source contains a texture ID, create a uniform for it.
        for (var textureID in this._materialTextures) {
            if (this._materialTextures.hasOwnProperty(textureID)) {
                if (this._containsToken(textureID)) {
                    var texturePath = this._materialTextures[textureID];
                    var textureUniformName = textureID + '_' + this._getNewGUID();
                    this._replaceToken(textureID, textureUniformName);
                    this._materialUniforms[textureUniformName] = texturePath;
                }
            }
        }

        // Set up uniforms for the main material
        var oldShaderSource = this._shaderSource;
        this._shaderSource = '#line 0\n';
        this._uniforms = {};
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
                this[uniformID] = uniformValue;
                this._uniforms[uniformID] = returnUniform(uniformID);

                // Add uniform declaration to source code.
                var uniformPhrase = 'uniform ' + uniformType + ' ' + uniformID + ';\n';
                if (oldShaderSource.indexOf(uniformPhrase) === -1) {
                    this._shaderSource += uniformPhrase;
                }

                // If uniform is a texture, load it.
                if (uniformType === 'sampler2D' || uniformType === 'samplerCube') {
                    this[uniformID] = this._texturePool.registerTextureToMaterial(this, uniformID, uniformValue, uniformType);
                }
            }
        }
        this._shaderSource += oldShaderSource;

        // Create all sub-materials
        var materials = [];
        for (var materialID in this._materialTemplates) {
            if (this._materialTemplates.hasOwnProperty(materialID)) {
                // Create a unique method name.
                var materialTemplate = this._materialTemplates[materialID];
                var material = new Material({'context' : this.context, 'template' : materialTemplate});

                // Make the material's agi_getMaterial unique by appending a guid.
                var originalMethodName = 'agi_getMaterial';
                var newMethodName = originalMethodName + '_' + this._getNewGUID();
                material._shaderSource = material._shaderSource.replace(new RegExp(originalMethodName, 'g'), newMethodName);
                materials.push(material);
                this[materialID] = material;

                // Replace each material id with the expanded glsl method call for each component expression.
                // Example: material.diffuse = diffuseMap.diffuse
                // Becomes: material.diffuse = agi_getMaterial_{guid}(materialInput).diffuse
                var newMethodCall = newMethodName + '(materialInput)';
                this._replaceToken(materialID, newMethodCall);
            }
        }

        // Combine source files and rename uniforms
        var newShaderSource = '';
        var newUniforms = {};
        materials.push(this);
        for (var i = 0; i < materials.length; i++) {
            var currentMaterial = materials[i];
            var oldUniforms = currentMaterial._uniforms;
            for (var oldUniformName in oldUniforms) {
                if (oldUniforms.hasOwnProperty(oldUniformName)) {
                    var newUniformName = oldUniformName + '_' + this._getNewGUID();
                    newUniforms[newUniformName] = oldUniforms[oldUniformName];
                    currentMaterial._replaceToken(oldUniformName, newUniformName);
                }
            }
            newShaderSource += '\n' + currentMaterial._shaderSource;
        }
        this._uniforms = newUniforms;
        this._shaderSource = newShaderSource;
    }

    Material.prototype._getNewGUID = function() {
        return createGuid().replace(new RegExp('-', 'g'), '').slice(0,5);
    };

    Material.prototype._extendTemplate = function(object1, object2) {
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
    Material.prototype._getTokenMatcher = function(token) {
        return new RegExp('([a-zA-Z0-9._])?' + token + '([a-zA-Z0-9_])?', 'g');
    };
    Material.prototype._containsToken = function(token) {
        return this._shaderSource.search(this._getTokenMatcher(token)) !== -1;
    };
    Material.prototype._replaceToken = function(token, newToken) {
        var replaceFunction = function (replace) {
            return function($0, $1, $2) {
                return ($1 || $2) ? $0 : replace;
            };
        };
        this._shaderSource = this._shaderSource.replace(this._getTokenMatcher(token), replaceFunction(newToken));
    };

    Material.prototype._checkForErrors = function() {
        // Make sure there are no duplicate names
        var duplicateNames = {};
        var groups = {'textures' : this._materialTextures, 'uniforms' : this._materialUniforms, 'materials' : this._materialTemplates};
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

        // Check that 'component', 'source', and 'sourcePath' are not in the same template.
        //var count = this._hasComponentSection + this._hasSourceSection + this._hasSourcePathSection;
        //if (count > 1) {
        //    throw new DeveloperError('Cannot have component, source, and sourcePath in the same template.');
        //}

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
                            that._updateMaterialsOnTextureLoad(texture, texturePath);
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
                            that._updateMaterialsOnTextureLoad(texture, texturePath);
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
    Material.prototype._materialFactory.addMaterial('DiffuseMapMaterial', {
        'id' : 'DiffuseMapMaterial',
        'uniforms' : {
            'u_repeat' : {
                'x' : 1,
                'y' : 1
            },
            'u_texture' : '../../Images/Cesium_Logo_Color.jpg'
        },
        'sourcePath' : 'DiffuseMapMaterial'
    });

    return Material;
});
