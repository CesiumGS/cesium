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
        '../Shaders/Materials/ImageMaterial',
        '../Shaders/Materials/NormalMapMaterial',
        '../Shaders/Materials/ReflectionMaterial',
        '../Shaders/Materials/RefractionMaterial',
        '../Shaders/Materials/SpecularMapMaterial',
        '../Shaders/Materials/StripeMaterial',
        '../Shaders/Materials/TieDyeMaterial',
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
        ImageMaterial,
        NormalMapMaterial,
        ReflectionMaterial,
        RefractionMaterial,
        SpecularMapMaterial,
        StripeMaterial,
        TieDyeMaterial,
        WoodMaterial) {
    "use strict";

    /**
     * A Material defines surface appearance through a combination of diffuse, specular,
     * normal, emission, and alpha values. These values are specified using a
     * JSON schema called Fabric which gets parsed and assembled into glsl shader code
     * behind-the-scenes. Check out the <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>wiki page</a>
     * for more details on Fabric.
     * <br /><br />
     * Base material types:
     * <table border='1' cellpadding='1'><tr>
     * <td>Color</td>
     * <td>color: Object with red, green, blue, and alpha values between 0.0 and 1.0.</td>
     * </tr><tr>
     * <td>Image</td>
     * <td>texture: String path to image.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.</td>
     * </tr><tr>
     * <td>DiffuseMap</td>
     * <td>texture: String path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired texture channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.</td>
     * </tr><tr>
     * <td>AlphaMap</td>
     * <td>texture: String path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired texture channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.</td>
     * </tr><tr>
     * <td>SpecularMap</td>
     * <td>texture: String path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired texture channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.</td>
     * </tr><tr>
     * <td>EmissionMap</td>
     * <td>texture: String path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired texture channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.</td>
     * </tr><tr>
     * <td>BumpMap</td>
     * <td>texture: String path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired texture channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.
     * <br />strength: Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps. </td>
     * </tr><tr>
     * <td>NormalMap</td>
     * <td> texture: String path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired texture channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the texture.
     * <br />strength: Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps. </td>
     * </tr><tr>
     * <td>Reflection</td>
     * <td>cubeMap: Object with positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ image paths.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired texture channels. </td>
     * </tr><tr>
     * <td>Refraction</td>
     * <td>cubeMap: Object with positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ image paths.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired texture channels.
     * <br />indexOfRefractionRatio: Number representing the refraction strength where 1.0 is the lowest and 0.0 is the highest. </td>
     * </tr><tr>
     * <td>Fresnel</td>
     * <td>reflection: Reflection Material.
     * <br />refraction: Refraction Material. </td>
     * </tr><tr>
     * <td>Brick</td>
     * <td>brickColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the brick color.
     * <br />mortarColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the mortar color.
     * <br />brickSize: Number between 0.0 and 1.0 where 0.0 is many small bricks and 1.0 is one large brick.
     * <br />brickPct: Number for the ratio of brick to mortar where 0.0 is all mortar and 1.0 is all brick.
     * <br />brickRoughness: Number between 0.0 and 1.0 representing how rough the brick looks.
     * <br />mortarRoughness: Number between 0.0 and 1.0 representing how rough the mortar looks. </td>
     * </tr><tr>
     * <td>Wood</td>
     * <td>lightWoodColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the wood's base color.
     * <br />darkWoodColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the color of rings in the wood.
     * <br />ringFrequency: Number for the frequency of rings in the wood.
     * <br />noiseScale: Object with x and y values specifying the noisiness of the ring patterns in both directions. </td>
     * </tr><tr>
     * <td>Asphalt</td>
     * <td>asphaltColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the asphalt's color.
     * <br />bumpSize: Number for the size of the asphalt's bumps.
     * <br />roughness: Number that controls how rough the asphalt looks. </td>
     * </tr><tr>
     * <td>Cement</td>
     * <td>cementColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the cement's color.
     * <br />grainScale: Number for the size of rock grains in the cement.
     * <br />roughness: Number that controls how rough the cement looks. </td>
     * </tr><tr>
     * <td>Grass</td>
     * <td>grassColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the grass' color.
     * <br />dirtColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the dirt's color.
     * <br />patchiness: Number that controls the size of the color patches in the grass. </td>
     * </tr><tr>
     * <td>Stripe</td>
     * <td>horizontal: Boolean that determines if the stripes are horizontal or vertical.
     * <br />lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the stripe's light alternating color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the stripe's dark alternating color.
     * <br />offset: Number that controls the stripe offset from the edge.
     * <br />repeat: Number that controls the total number of stripes, half light and half dark. </td>
     * </tr><tr>
     * <td>Checkerboard</td>
     * <td>lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the checkerboard's light alternating color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the checkerboard's dark alternating color.
     * <br />repeat: Object with x and y values specifying the number of columns and rows respectively. </td>
     * </tr><tr>
     * <td>Dot</td>
     * <td>lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the dot color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the background color.
     * <br />repeat: Object with x and y values specifying the number of columns and rows of dots respectively. </td>
     * </tr><tr>
     * <td>TieDye</td>
     * <td>lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the light color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr><tr>
     * <td>Facet</td>
     * <td>lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the light color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr><tr>
     * <td>Blob</td>
     * <td>lightColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the light color.
     * <br />darkColor: Object with red, green, blue, and alpha values between 0.0 and 1.0 for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr></table>
     *
     * @alias Material
     *
     * @param {Context} description.context The context in which textures get created. Optional if the material does not use textures.
     * @param {Boolean} [description.strict = false] Throws errors for issues that would normally be ignored, including unused uniforms or materials.
     * @param {Object} description.fabric The fabric JSON used to generate the material.
     *
     * @constructor
     *
     * @exception {DeveloperError} fabric: uniform has invalid type.
     * @exception {DeveloperError} fabric: uniforms and materials cannot share the same property.
     * @exception {DeveloperError} fabric: cannot have source and components in the same section.
     * @exception {DeveloperError} fabric: property name is not valid. It should be 'id', 'materials', 'uniforms', 'components', or 'source'.
     * @exception {DeveloperError} fabric: property name is not valid. It should be 'diffuse', 'specular', 'normal', 'emission', or 'alpha'.
     * @exception {DeveloperError} texture: context is not defined.
     * @exception {DeveloperError} texture: texture image not found.
     * @exception {DeveloperError} texture: cube map image not found.
     * @exception {DeveloperError} strict: shader source does not use string.
     * @exception {DeveloperError} strict: shader source does not use uniform.
     * @exception {DeveloperError} strict: shader source does not use material.
     *
     * @example
     * // The default material:
     * var material = new Material();
     *
     * // Color material:
     * var material = new Material({
     *     fabric : {
     *         "id" : "Color",
     *         "uniforms" : {
     *             "color" : {
     *                 "red" : 1.0,
     *                 "green" : 0.0,
     *                 "blue" : 0.0,
     *                 "alpha" : 1.0
     *             }
     *         }
     *     }
     * });
     *
     * //Diffuse specular material:
     * var material = new Material({
     *     context : context,
     *     fabric : {
     *         "materials" : {
     *             "diffuseMaterial" : {
     *                 "id" : "DiffuseMap",
     *                 "uniforms" : {
     *                     "texture" : "diffuseMap.png"
     *                 }
     *             },
     *             "specularMaterial" : {
     *                 "id" : "SpecularMap",
     *                 "uniforms" : {
     *                     "texture" : "specularMap.png"
     *                 }
     *              }
     *         },
     *         "components" : {
     *             "diffuse" : "diffuseMaterial.diffuse",
     *             "specular" : "specularMaterial.specular"
     *         }
     *     }
     *
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric wiki page</a>
     */

    function Material(description) {
        var that = this;
        this._description = description || {};
        this._context = this._description.context;
        this._strict = (typeof this._description.strict !== 'undefined') ? this._description.strict : false;
        this._template = this._description.fabric || {};
        this._materialID = this._template.id;

        // If the cache contains this material ID, build the material template off of the stored template.
        var isOldMaterialType = Material._materialCache.hasMaterial(this._materialID);
        if (isOldMaterialType) {
            var newMaterialTemplate = clone(Material._materialCache.getMaterial(this._materialID));
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

        // If the material has a new ID, add it to the cache.
        var isNewMaterialType = (isOldMaterialType === false) && (typeof this._materialID !== 'undefined');
        if (isNewMaterialType){
            Material._materialCache.addMaterial(this._materialID, this._template);
        }

        // Build the shader source for the main material.
        this._shaderSource = '';
        if (this._hasSourceSection) {
            this._shaderSource += this._materialSource + '\n';
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
                if (type === 'number') {
                    uniformType = 'float';
                }
                else if (type === 'boolean') {
                    uniformType = 'bool';
                }
                else if (type === 'string') {
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
                throw new DeveloperError('Uniform \'' + uniformID + '\' has invalid type.');
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
                if (uniformType.indexOf('sampler') !== -1) {
                    if(!(uniformValue instanceof Texture || uniformValue instanceof CubeMap)) {
                        uniformValue = Material._textureCache.registerTextureToMaterial(that, uniformID, uniformValue, uniformType);
                    }
                    var uniformDimensionsName = uniformID + 'Dimensions';
                    if(that.hasOwnProperty(uniformDimensionsName)) {
                        var uniformDimensions = that[uniformDimensionsName];
                        uniformDimensions.x = (uniformValue instanceof Texture) ? uniformValue._width : uniformValue._size;
                        uniformDimensions.y = (uniformValue instanceof Texture) ? uniformValue._height : uniformValue._size;
                    }
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
                var material = new Material({context : this._context, strict : this._strict, fabric : materialTemplate});
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

    /**
     * Returns the glsl source code for this material.
     *
     * @memberof Material
     *
     * @returns {String} glsl source code.
     */
    Material.prototype.getShaderSource = function() {
        return this._shaderSource;
    };

    /**
     * Returns the id for this material. The returned value is undefined if
     * the id was not set.
     *
     * @memberof Material
     *
     * @returns {String} Material id.
     */
    Material.prototype.getID = function() {
        return this._materialID;
    };

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

        var checkForValidProperties = function(object, properties, result, throwNotFound) {
            if (typeof object !== 'undefined') {
                for (var property in object) {
                    if (object.hasOwnProperty(property)) {
                        if (throwNotFound * (properties.indexOf(property) === -1)) {
                            result(property, properties);
                        }
                    }
                }
            }
        };

        // Make sure all template and components properties are valid.
        var invalidNameError = function(property, properties) {
            var errorString = 'Property name \'' + property + '\' is not valid. It should be ';
            for (var i = 0; i < properties.length; i++) {
                var lastCharacter = i === properties.length - 1;
                errorString += lastCharacter ? 'or ' : '';
                errorString += '\'' + properties[i] + '\'';
                errorString += lastCharacter ? '.' : ', ';
            }
            throw new DeveloperError(errorString);
        };
        checkForValidProperties(this._template, ['id', 'materials', 'uniforms', 'components', 'source'], invalidNameError, true);
        checkForValidProperties(this._materialComponents,  ['diffuse', 'specular', 'normal', 'emission', 'alpha'], invalidNameError, true);

        // Make sure uniforms and materials do not share any of the same names.
        var duplicateNameError = function(property, properties) {
            var errorString = 'Uniforms and materials cannot share the same property \'' + property + '\'';
            throw new DeveloperError(errorString);
        };
        var materialNames = [];
        for (var property in this._materialTemplates) {
            if (this._materialTemplates.hasOwnProperty(property)) {
                materialNames.push(property);
            }
        }
        checkForValidProperties(this._materialUniforms, materialNames, duplicateNameError, false);
    };

    Material._textureCache = {
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
                            }, function() {
                                throw new DeveloperError('Cube map image not found.');
                            });
                        }
                    }
                }
            }
            return texture;
        }
    };
    Material._materialCache = {
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

    /**
     * Static method for creating a new material using an existing materialID.
     * <br /><br />
     * Shorthand for: new Material({context : context, fabric : {"id" : materialID}});
     *
     * @param {Context} context The context in which textures get created. Can be undefined if the material does not use textures.
     * @param {String} materialID The base material id.
     *
     * @returns {Material} New material object.
     *
     * @exception {DeveloperError} Material with that id does not exist.
     *
     * @example
     * var material = Material.fromID(context, 'Color');
     * material.color = vec4(1.0, 0.0, 0.0, 1.0);
     */

    Material.fromID = function(context, materialID) {
        if (!Material._materialCache.hasMaterial(materialID)) {
            throw new DeveloperError('Material with id \'' + materialID + '\' does not exist.');
        }
        return new Material({
            context : context,
            fabric : {
                "id" : materialID
            }
        });
    };

    // Color Material
    Material._materialCache.addMaterial('Color', {
        "id" : "Color",
        "uniforms" : {
            "color" : new Color(1.0, 0.0, 0.0, 0.5)
        },
        "source" : ColorMaterial
    });

    // Image Material.
    // Useful for textures with an alpha component.
    Material._materialCache.addMaterial('Image', {
        "id" : "Image",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : ImageMaterial
    });

    // Diffuse Map Material
    Material._materialCache.addMaterial('DiffuseMap', {
        "id" : "DiffuseMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channels" : "rgb",
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : DiffuseMapMaterial
    });

    // Alpha Map Material
    Material._materialCache.addMaterial('AlphaMap', {
        "id" : "AlphaMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channel" : "a",
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : AlphaMapMaterial
    });

    // Specular Map Material
    Material._materialCache.addMaterial('SpecularMap' , {
        "id" : "SpecularMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channel" : "r",
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : SpecularMapMaterial
    });

    // Emission Map Material
    Material._materialCache.addMaterial('EmissionMap' , {
        "id" : "EmissionMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channels" : "rgb",
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : EmissionMapMaterial
    });

    // Bump Map Material
    Material._materialCache.addMaterial('BumpMap' , {
        "id" : "BumpMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channel" : "r",
            "strength" : 0.8,
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : BumpMapMaterial
    });

    // Normal Map Material
    Material._materialCache.addMaterial('NormalMap', {
        "id" : "NormalMap",
        "uniforms" : {
            "texture" : "agi_defaultTexture",
            "channels" : "rgb",
            "strength" : 0.8,
            "repeat" : {
                "x" : 1,
                "y" : 1
            }
        },
        "source" : NormalMapMaterial
    });

    // Reflection Material
    Material._materialCache.addMaterial('Reflection', {
        "id" : "Reflection",
        "uniforms" : {
            "cubeMap" : "agi_defaultCubeMap",
            "channels" : "rgb"
        },
        "source" : ReflectionMaterial
    });

    // Refraction Material
    Material._materialCache.addMaterial('Refraction', {
        "id" : "Refraction",
        "uniforms" : {
            "cubeMap" : "agi_defaultCubeMap",
            "channels" : "rgb",
            "indexOfRefractionRatio" : 0.9
        },
        "source" : RefractionMaterial
    });

    // Fresnel Material
    Material._materialCache.addMaterial('Fresnel' , {
        "id" : "Fresnel",
        "materials" : {
            "reflection" : {
                "id" : "Reflection"
            },
            "refraction" : {
                "id" : "Refraction"
            }
        },
        "source" : FresnelMaterial
    });

    // Brick Material
    Material._materialCache.addMaterial('Brick', {
        "id" : "Brick",
        "uniforms" : {
            "brickColor" : {
                "red": 0.6,
                "green": 0.3,
                "blue": 0.1,
                "alpha": 1.0
            },
            "mortarColor" : {
                "red" : 0.8,
                "green" : 0.8,
                "blue" : 0.7,
                "alpha" : 1.0
            },
            "brickSize" : {
                "x" : 0.30,
                "y" : 0.15
            },
            "brickPct" : {
                "x" : 0.90,
                "y" : 0.85
            },
            "brickRoughness" : 0.2,
            "mortarRoughness" : 0.1
        },
        "source" : BrickMaterial
    });

    // Wood Material
    Material._materialCache.addMaterial('Wood', {
        "id" : "Wood",
        "uniforms" : {
            "lightWoodColor" : {
                "red" : 0.6,
                "green" : 0.3,
                "blue" : 0.1,
                "alpha" : 1.0
            },
            "darkWoodColor" : {
                "red" : 0.4,
                "green" : 0.2,
                "blue" : 0.07,
                "alpha" : 1.0
            },
            "ringFrequency" : 3.0,
            "noiseScale" : {
                "x" : 0.7,
                "y" : 0.5
            },
            "grainFrequency" : 27.0
        },
        "source" : WoodMaterial
    });

    // Asphalt Material
    Material._materialCache.addMaterial('Asphalt', {
        "id" : "Asphalt",
        "uniforms" : {
            "asphaltColor" : {
                "red" : 0.15,
                "green" : 0.15,
                "blue" : 0.15,
                "alpha" : 1.0
            },
            "bumpSize" : 0.02,
            "roughness" : 0.2
        },
        "source" : AsphaltMaterial
    });

    // Cement Material
    Material._materialCache.addMaterial('Cement', {
        "id" : "Cement",
        "uniforms" : {
            "cementColor" : {
                "red" : 0.95,
                "green" : 0.95,
                "blue" : 0.85,
                "alpha" : 1.0
            },
            "grainScale" : 0.01,
            "roughness" : 0.3
        },
        "source" : CementMaterial
    });

    // Grass Material
    Material._materialCache.addMaterial('Grass', {
        "id" : "Grass",
        "uniforms" : {
            "grassColor" : {
                "red" : 0.25,
                "green" : 0.4,
                "blue" : 0.1,
                "alpha" : 1.0
            },
            "dirtColor" : {
                "red" : 0.1,
                "green" : 0.1,
                "blue" : 0.1,
                "alpha" : 1.0
            },
            "patchiness" : 1.5
        },
        "source" : GrassMaterial
    });

    // Stripe Material
    Material._materialCache.addMaterial('Stripe', {
        "id" : "Stripe",
        "uniforms" : {
            "horizontal" : true,
            "lightColor" : {
                "red" : 1.0,
                "green" : 1.0,
                "blue" : 1.0,
                "alpha" : 0.5
            },
            "darkColor" : {
                "red" : 0.0,
                "green" : 0.0,
                "blue" : 1.0,
                "alpha" : 0.5
            },
            "offset" : 0.0,
            "repeat" : 5.0
        },
        "source" : StripeMaterial
    });

    // Checkerboard Material
    Material._materialCache.addMaterial('Checkerboard', {
        "id" : "Checkerboard",
        "uniforms" : {
            "lightColor" : {
                "red" : 1.0,
                "green" : 1.0,
                "blue" : 1.0,
                "alpha" : 0.5
            },
            "darkColor" : {
                "red" : 0.0,
                "green" : 0.0,
                "blue" : 0.0,
                "alpha" : 0.5
            },
            "repeat" : {
                "x" : 5.0,
                "y" : 5.0
            }
        },
        "source" : CheckerboardMaterial
    });

    // Dot Material
    Material._materialCache.addMaterial('Dot', {
        "id" : "DotMaterial",
        "uniforms" : {
            "lightColor" : {
                "red" : 1.0,
                "green" : 1.0,
                "blue" : 0.0,
                "alpha" : 0.75
            },
            "darkColor" : {
                "red" : 0.0,
                "green" : 1.0,
                "blue" : 1.0,
                "alpha" : 0.75
            },
            "repeat" : {
                "x" : 5.0,
                "y" : 5.0
            }
        },
        "source" : DotMaterial
    });

    // Tie-Dye Material
    Material._materialCache.addMaterial('TieDye', {
        "id" : "TieDye",
        "uniforms" : {
            "lightColor" : {
                "red" : 1.0,
                "green" : 1.0,
                "blue" : 0.0,
                "alpha" : 0.75
            },
            "darkColor" : {
                "red" : 1.0,
                "green" : 0.0,
                "blue" : 0.0,
                "alpha" : 0.75
            },
            "frequency" : 5.0
        },
        "source" : TieDyeMaterial
    });

    // Facet Material
    Material._materialCache.addMaterial('Facet', {
        "id" : "Facet",
        "uniforms" : {
            "lightColor" : {
                "red" : 0.25,
                "green" : 0.25,
                "blue" : 0.25,
                "alpha" : 0.75
            },
            "darkColor" : {
                "red" : 0.75,
                "green" : 0.75,
                "blue" : 0.75,
                "alpha" : 0.75
            },
            "frequency" : 10.0
        },
        "source" : FacetMaterial
    });

    // Blob Material
    Material._materialCache.addMaterial('Blob', {
        "id" : "Blob",
        "uniforms" : {
            "lightColor" : {
                "red" : 1.0,
                "green" : 1.0,
                "blue" : 1.0,
                "alpha" : 0.5
            },
            "darkColor" : {
                "red" : 0.0,
                "green" : 0.0,
                "blue" : 1.0,
                "alpha" : 0.5
            },
            "frequency" : 10.0
        },
        "source" : BlobMaterial
    });

    return Material;
});
