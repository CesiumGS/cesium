/*global define*/
define([
        '../ThirdParty/when',
        '../Core/loadImage',
        '../Core/DeveloperError',
        '../Core/createGuid',
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Renderer/Texture',
        '../Renderer/CubeMap',
        '../Shaders/Materials/AsphaltMaterial',
        '../Shaders/Materials/BlobMaterial',
        '../Shaders/Materials/BrickMaterial',
        '../Shaders/Materials/BumpMapMaterial',
        '../Shaders/Materials/CementMaterial',
        '../Shaders/Materials/CheckerboardMaterial',
        '../Shaders/Materials/DotMaterial',
        '../Shaders/Materials/FacetMaterial',
        '../Shaders/Materials/FresnelMaterial',
        '../Shaders/Materials/GrassMaterial',
        '../Shaders/Materials/NormalMapMaterial',
        '../Shaders/Materials/ReflectionMaterial',
        '../Shaders/Materials/RefractionMaterial',
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
        combine,
        defaultValue,
        Matrix2,
        Matrix3,
        Matrix4,
        Texture,
        CubeMap,
        AsphaltMaterial,
        BlobMaterial,
        BrickMaterial,
        BumpMapMaterial,
        CementMaterial,
        CheckerboardMaterial,
        DotMaterial,
        FacetMaterial,
        FresnelMaterial,
        GrassMaterial,
        NormalMapMaterial,
        ReflectionMaterial,
        RefractionMaterial,
        StripeMaterial,
        TieDyeMaterial,
        WoodMaterial) {
    "use strict";

    /**
     * A Material defines surface appearance through a combination of diffuse, specular,
     * normal, emission, and alpha components. These values are specified using a
     * JSON schema called Fabric which gets parsed and assembled into glsl shader code
     * behind-the-scenes. Check out the <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>wiki page</a>
     * for more details on Fabric.
     * <br /><br />
     * Base material types:
     * <table border='1' cellpadding='1'><tr>
     * <td>Color</td>
     * <td>color: rgba color object.</td>
     * </tr><tr>
     * <td>Image</td>
     * <td>image: path to image.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.</td>
     * </tr><tr>
     * <td>DiffuseMap</td>
     * <td>image: path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired image channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.</td>
     * </tr><tr>
     * <td>AlphaMap</td>
     * <td>image: path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired image channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.</td>
     * </tr><tr>
     * <td>SpecularMap</td>
     * <td>image: path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired image channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.</td>
     * </tr><tr>
     * <td>EmissionMap</td>
     * <td>image: path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired image channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.</td>
     * </tr><tr>
     * <td>BumpMap</td>
     * <td>image: path to image.
     * <br />channel: One character string containing r, g, b, or a for selecting the desired image channel.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.
     * <br />strength: Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps. </td>
     * </tr><tr>
     * <td>NormalMap</td>
     * <td> image: path to image.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired image channels.
     * <br />repeat: Object with x and y values specifying the number of times to repeat the image.
     * <br />strength: Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps. </td>
     * </tr><tr>
     * <td>Reflection</td>
     * <td>cubeMap: Object with positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ image paths.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired image channels. </td>
     * </tr><tr>
     * <td>Refraction</td>
     * <td>cubeMap: Object with positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ image paths.
     * <br />channels: Three character string containing any combination of r, g, b, and a for selecting the desired image channels.
     * <br />indexOfRefractionRatio: Number representing the refraction strength where 1.0 is the lowest and 0.0 is the highest. </td>
     * </tr><tr>
     * <td>Fresnel</td>
     * <td>reflection: Reflection Material.
     * <br />refraction: Refraction Material. </td>
     * </tr><tr>
     * <td>Brick</td>
     * <td>brickColor: rgba color object for the brick color.
     * <br />mortarColor: rgba color object for the mortar color.
     * <br />brickSize: Number between 0.0 and 1.0 where 0.0 is many small bricks and 1.0 is one large brick.
     * <br />brickPct: Number for the ratio of brick to mortar where 0.0 is all mortar and 1.0 is all brick.
     * <br />brickRoughness: Number between 0.0 and 1.0 representing how rough the brick looks.
     * <br />mortarRoughness: Number between 0.0 and 1.0 representing how rough the mortar looks. </td>
     * </tr><tr>
     * <td>Wood</td>
     * <td>lightWoodColor: rgba color object for the wood's base color.
     * <br />darkWoodColor: rgba color object for the color of rings in the wood.
     * <br />ringFrequency: Number for the frequency of rings in the wood.
     * <br />noiseScale: Object with x and y values specifying the noisiness of the ring patterns in both directions. </td>
     * </tr><tr>
     * <td>Asphalt</td>
     * <td>asphaltColor: rgba color object for the asphalt's color.
     * <br />bumpSize: Number for the size of the asphalt's bumps.
     * <br />roughness: Number that controls how rough the asphalt looks. </td>
     * </tr><tr>
     * <td>Cement</td>
     * <td>cementColor: rgba color object for the cement's color.
     * <br />grainScale: Number for the size of rock grains in the cement.
     * <br />roughness: Number that controls how rough the cement looks. </td>
     * </tr><tr>
     * <td>Grass</td>
     * <td>grassColor: rgba color object for the grass' color.
     * <br />dirtColor: rgba color object for the dirt's color.
     * <br />patchiness: Number that controls the size of the color patches in the grass. </td>
     * </tr><tr>
     * <td>Stripe</td>
     * <td>horizontal: Boolean that determines if the stripes are horizontal or vertical.
     * <br />lightColor: rgba color object for the stripe's light alternating color.
     * <br />darkColor: rgba color object for the stripe's dark alternating color.
     * <br />offset: Number that controls the stripe offset from the edge.
     * <br />repeat: Number that controls the total number of stripes, half light and half dark. </td>
     * </tr><tr>
     * <td>Checkerboard</td>
     * <td>lightColor: rgba color object for the checkerboard's light alternating color.
     * <br />darkColor: rgba color object for the checkerboard's dark alternating color.
     * <br />repeat: Object with x and y values specifying the number of columns and rows respectively. </td>
     * </tr><tr>
     * <td>Dot</td>
     * <td>lightColor: rgba color object for the dot color.
     * <br />darkColor: rgba color object for the background color.
     * <br />repeat: Object with x and y values specifying the number of columns and rows of dots respectively. </td>
     * </tr><tr>
     * <td>TieDye</td>
     * <td>lightColor: rgba color object for the light color.
     * <br />darkColor: rgba color object for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr><tr>
     * <td>Facet</td>
     * <td>lightColor: rgba color object for the light color.
     * <br />darkColor: rgba color object for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr><tr>
     * <td>Blob</td>
     * <td>lightColor: rgba color object for the light color.
     * <br />darkColor: rgba color object for the dark color.
     * <br />frequency: Number that controls the frequency of the pattern. </td>
     * </tr></table>
     *
     * @alias Material
     *
     * @param {Context} description.context The context used to create textures if the material uses them.
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
     * @exception {DeveloperError} image: context is not defined.
     * @exception {DeveloperError} strict: shader source does not use string.
     * @exception {DeveloperError} strict: shader source does not use uniform.
     * @exception {DeveloperError} strict: shader source does not use material.
     *
     * @example
     * // Create a color material with fromID:
     * polygon.material = Material.fromID(context, 'Color');
     * polygon.material.uniforms.color = {
     *     red : 1.0,
     *     green : 1.0,
     *     blue : 0.0
     *     alpha : 1.0
     * };
     *
     * // Create the default material:
     * polygon.material = new Material();
     *
     * // Create a color material with full Fabric notation:
     * polygon.material = new Material({
     *     context : context,
     *     fabric : {
     *         id : 'Color',
     *         uniforms : {
     *             color : {
     *                 red : 1.0,
     *                 green : 1.0,
     *                 blue : 0.0,
     *                 alpha : 1.0
     *             }
     *         }
     *     }
     * });
     *
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric wiki page</a> for a more detailed description of Fabric.
     *
     */

    var Material = function(description) {
        this._description = defaultValue(description, {});
        this._context = this._description.context;
        this._strict = defaultValue(this._description.strict, false);
        this._template = defaultValue(this._description.fabric, {});
        this._template.uniforms = defaultValue(this._template.uniforms, {});
        this._template.materials = defaultValue(this._template.materials, {});

        /**
         * The material id. Can be an existing id or a new id. If no id is specified in fabric, id is undefined.
         * @type String
         */
        Object.defineProperty(this, 'id', { value : this._template.id, writable : false});
        /**
         * The glsl shader source for this material.
         * @type String
         */
        this.shaderSource = '';
        /**
         * Maps sub-material names to Material objects.
         * @type Object
         */
        this.materials = {};
        /**
         * Maps uniform names to their values.
         * @type Object
         */
        this.uniforms = {};
        this._uniforms = {};

        // If the cache contains this material id, build the material template off of the stored template.
        var oldMaterialTemplate = Material._materialCache.getMaterial(this.id);
        if (typeof oldMaterialTemplate !== 'undefined') {
            this._template = combine([this._template, oldMaterialTemplate]);
        }

        // Make sure the template has no obvious errors. More error checking happens later.
        checkForTemplateErrors(this);

        // If the material has a new id, add it to the cache.
        if ((typeof oldMaterialTemplate === 'undefined') && (typeof this.id !== 'undefined')){
            Material._materialCache.addMaterial(this.id, this._template);
        }

        createMethodDefinition(this);
        createUniforms(this);
        createSubMaterials(this);
    };

    /**
     * Creates a new material using an existing materialId.
     * <br /><br />
     * Shorthand for: new Material({context : context, fabric : {id : materialId}});
     *
     * @param {Context} context The context used to create textures if the material uses them.
     * @param {String} materialId The base material id.
     *
     * @returns {Material} New material object.
     *
     * @exception {DeveloperError} material with that id does not exist.
     *
     * @example
     * var material = Material.fromId(context, 'Color');
     * material.uniforms.color = vec4(1.0, 0.0, 0.0, 1.0);
     */

    Material.fromId = function(context, materialId) {
        if (typeof Material._materialCache.getMaterial(materialId) === 'undefined') {
            throw new DeveloperError('material with id \'' + materialId + '\' does not exist.');
        }
        return new Material({
            context : context,
            fabric : {
                id : materialId
            }
        });
    };

    var checkForTemplateErrors = function(material) {
        var template = material._template;
        var uniforms = material._template.uniforms;
        var materials = material._template.materials;
        var components = material._template.components;
        var source = material._template.source;

        // Make sure source and components do not exist in the same template.
        if ((typeof components !== 'undefined') && (typeof source !== 'undefined')) {
            throw new DeveloperError('fabric: cannot have source and components in the same template.');
        }

        var checkForValidProperties = function(object, properties, result, throwNotFound) {
            if (typeof object !== 'undefined') {
                for (var property in object) {
                    if (object.hasOwnProperty(property)) {
                        var hasProperty = properties.indexOf(property) !== -1;
                        if ((throwNotFound && !hasProperty) || (!throwNotFound && hasProperty)) {
                            result(property, properties);
                        }
                    }
                }
            }
        };

        // Make sure all template and components properties are valid.
        var invalidNameError = function(property, properties) {
            var errorString = 'fabric: property name \'' + property + '\' is not valid. It should be ';
            for (var i = 0; i < properties.length; i++) {
                var propertyName = '\'' + properties[i] + '\'';
                errorString += (i === properties.length - 1) ? ('or ' + propertyName + '.') : (propertyName + ', ');
            }
            throw new DeveloperError(errorString);
        };
        checkForValidProperties(template, ['id', 'materials', 'uniforms', 'components', 'source'], invalidNameError, true);
        checkForValidProperties(components,  ['diffuse', 'specular', 'normal', 'emission', 'alpha'], invalidNameError, true);

        // Make sure uniforms and materials do not share any of the same names.
        var duplicateNameError = function(property, properties) {
            var errorString = 'fabric: uniforms and materials cannot share the same property \'' + property + '\'';
            throw new DeveloperError(errorString);
        };
        var materialNames = [];
        for (var property in materials) {
            if (materials.hasOwnProperty(property)) {
                materialNames.push(property);
            }
        }
        checkForValidProperties(uniforms, materialNames, duplicateNameError, false);
    };

    // Create the agi_getMaterial method body using source or components.
    var createMethodDefinition = function(material) {
        var components = material._template.components;
        var source = material._template.source;
        if (typeof source !== 'undefined') {
            material.shaderSource += source + '\n';
        }
        else {
            material.shaderSource += 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n';
            material.shaderSource += 'agi_material material = agi_getDefaultMaterial(materialInput);\n';
            if (typeof components !== 'undefined') {
                for (var component in components) {
                    if (components.hasOwnProperty(component)) {
                        material.shaderSource += 'material.' + component + ' = ' + components[component] + ';\n';
                    }
                }
            }
            material.shaderSource += 'return material;\n}\n';
        }
    };

    var createUniforms = function(material) {
        var uniforms = material._template.uniforms;
        for (var uniformId in uniforms) {
            if (uniforms.hasOwnProperty(uniformId)) {
                createUniform(material, uniformId);
            }
        }
    };
    // Writes uniform declarations to the shader file and connects uniform values with
    // corresponding material properties through the returnUniforms function.
    var createUniform = function(material, uniformId) {
        var context = material._context;
        var strict = material._strict;
        var materialUniforms = material._template.uniforms;
        var uniformValue = materialUniforms[uniformId];
        var uniformType = getUniformType(uniformValue);
        if (typeof uniformType === 'undefined') {
            throw new DeveloperError('fabric: uniform \'' + uniformId + '\' has invalid type.');
        }
        else if (uniformType === 'channels') {
            if (replaceToken(material, uniformId, uniformValue, false) === 0 && strict) {
                throw new DeveloperError('strict: shader source does not use channels \'' + uniformId + '\'.');
            }
        }
        else {
            // If uniform type is an image, add image dimension uniforms.
            if (uniformType.indexOf('sampler') !== -1) {
                if (typeof context === 'undefined') {
                    throw new DeveloperError('image: context is not defined');
                }
            }
            // Since webgl doesn't allow texture dimension queries in glsl, create a uniform to do it.
            // Check if the shader source actually uses texture dimensions before creating the uniform.
            if (uniformType === 'sampler2D') {
                var imageDimensionsUniformName = uniformId + 'Dimensions';
                if (getNumberOfTokens(material, imageDimensionsUniformName) > 0) {
                    materialUniforms[imageDimensionsUniformName] = {'x' : 1.0, 'y' : 1.0};
                    createUniform(material, imageDimensionsUniformName);
                }
            }
            // Add uniform declaration to source code.
            var uniformPhrase = 'uniform ' + uniformType + ' ' + uniformId + ';\n';
            if (material.shaderSource.indexOf(uniformPhrase) === -1) {
                material.shaderSource = uniformPhrase + material.shaderSource;
            }
            // Replace uniform name with guid version.
            var newUniformId = uniformId + '_' + getRandomId();
            if (replaceToken(material, uniformId, newUniformId) === 1 && strict) {
                throw new DeveloperError('strict: shader source does not use uniform \'' + uniformId + '\'.');
            }
            // Set uniform value
            material.uniforms[uniformId] = uniformValue;
            material._uniforms[newUniformId] = returnUniform(material, uniformId, uniformType);
        }
    };
    // Checks for updates to material values to refresh the uniforms.
    var matrixMap = {'mat2' : Matrix2, 'mat3' : Matrix3, 'mat4' : Matrix4};
    var returnUniform = function (material, uniformId, originalUniformType) {
        return function() {
            var uniforms = material.uniforms;
            var uniformValue = uniforms[uniformId];
            var uniformType = getUniformType(uniformValue);

            if (originalUniformType === 'sampler2D' && (uniformType === originalUniformType || uniformValue instanceof Texture)) {
                if (uniformType === originalUniformType) {
                    uniformValue = Material._textureCache.registerTextureToMaterial(material, uniformId, uniformValue);
                }
                // Since texture dimensions can't be updated manually, update them when the texture is updated.
                var uniformDimensionsName = uniformId + 'Dimensions';
                if(uniforms.hasOwnProperty(uniformDimensionsName)) {
                    var uniformDimensions = uniforms[uniformDimensionsName];
                    uniformDimensions.x = uniformValue._width;
                    uniformDimensions.y = uniformValue._height;
                }
            }
            else if (originalUniformType === 'samplerCube' && (uniformType === originalUniformType || uniformValue instanceof CubeMap)) {
                if (uniformType === originalUniformType) {
                    uniformValue = Material._textureCache.registerCubeMapToMaterial(material, uniformId, uniformValue);
                }
            }
            else if (originalUniformType.indexOf('mat') !== -1 && (uniformType === originalUniformType || uniformValue instanceof matrixMap[originalUniformType])) {
                if (uniformType === originalUniformType) {
                    uniformValue = matrixMap[originalUniformType].fromColumnMajorArray(uniformValue);
                }
            }
            else if (typeof uniformType === 'undefined' || originalUniformType !== uniformType) {
                throw new DeveloperError('fabric: uniform \'' + uniformId + '\' has invalid value.');
            }
            uniforms[uniformId] = uniformValue;
            return uniforms[uniformId];
        };
    };
    // Determines the uniform type based on the uniform in the template.
    var getUniformType = function(uniformValue) {
        var uniformType = uniformValue.type;
        if (typeof uniformType === 'undefined') {
            var type = typeof uniformValue;
            if (type === 'number') {
                uniformType = 'float';
            }
            else if (type === 'boolean') {
                uniformType = 'bool';
            }
            else if (type === 'string') {
                if (/^([rgba]){1,4}$/i.test(uniformValue)) {
                    uniformType = 'channels';
                }
                else if (uniformValue === Material.DefaultCubeMapId) {
                    uniformType = 'samplerCube';
                }
                else {
                    uniformType = 'sampler2D';
                }
            }
            else if (type === 'object') {
                if (Array.isArray(uniformValue)) {
                    if (uniformValue.length === 4 || uniformValue.length === 9 || uniformValue.length === 16) {
                        uniformType = 'mat' + Math.sqrt(uniformValue.length);
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
                        uniformType = 'samplerCube';
                    }
                }
            }
        }
        return uniformType;
    };

    // Create all sub-materials by combining source and uniforms together.
    var createSubMaterials = function(material) {
        var context = material._context;
        var strict = material._strict;
        var subMaterialTemplates = material._template.materials;
        for (var subMaterialId in subMaterialTemplates) {
            if (subMaterialTemplates.hasOwnProperty(subMaterialId)) {
                // Construct the sub-material.
                var subMaterial = new Material({context : context, strict : strict, fabric : subMaterialTemplates[subMaterialId]});
                material._uniforms = combine([material._uniforms, subMaterial._uniforms]);
                material.materials[subMaterialId] = subMaterial;

                // Make the material's agi_getMaterial unique by appending a guid.
                var originalMethodName = 'agi_getMaterial';
                var newMethodName = originalMethodName + '_' + getRandomId();
                replaceToken(subMaterial, originalMethodName, newMethodName);
                material.shaderSource = subMaterial.shaderSource + material.shaderSource;

                // Replace each material id with an agi_getMaterial method call.
                var materialMethodCall = newMethodName + '(materialInput)';
                if (replaceToken(material, subMaterialId, materialMethodCall) === 0 && strict) {
                    throw new DeveloperError('strict: shader source does not use material \'' + subMaterialId + '\'.');
                }
            }
        }
    };

    // Used for searching or replacing a token in a material's shader source with something else.
    // If excludePeriod is true, do not accept tokens that are preceded by periods.
    // http://stackoverflow.com/questions/641407/javascript-negative-lookbehind-equivalent
    var replaceToken = function(material, token, newToken, excludePeriod) {
        excludePeriod = defaultValue(excludePeriod, true);
        var count = 0;
        var invalidCharacters = 'a-zA-Z0-9_';
        var suffixChars = '([' + invalidCharacters + '])?';
        var prefixChars = '([' + invalidCharacters + (excludePeriod ? '.' : '') + '])?';
        var regExp = new RegExp(prefixChars + token + suffixChars, 'g');
        material.shaderSource = material.shaderSource.replace(regExp, function($0, $1, $2) {
            if ($1 || $2) {
                return $0;
            }
            count += 1;
            return newToken;
        });
        return count;
    };
    var getNumberOfTokens = function(material, token, excludePeriod) {
        return replaceToken(material, token, token, excludePeriod);
    };

    // Returns a random id for differentiating uniforms and materials with the same names.
    var getRandomId = function() {
        return createGuid().slice(0,8);
    };

    Material._textureCache = {
        _pathsToMaterials : {},
        _pathsToTextures : {},
        _updateMaterialsOnLoad : function(texture, path) {
            this._pathsToTextures[path] = texture;
            var materialContainers = this._pathsToMaterials[path];
            for (var i = 0; i < materialContainers.length; i++) {
                var materialContainer = materialContainers[i];
                var material = materialContainer.material;
                var property = materialContainer.property;
                material.uniforms[property] = texture;
            }
        },
        registerCubeMapToMaterial : function(material, property, info) {
            var that = this;
            var path = info.positiveX + info.negativeX + info.positiveY + info.negativeY + info.positiveZ + info.negativeZ;
            var texture = this._pathsToTextures[path];
            if (typeof texture === 'undefined') {
                texture = (material.uniforms[property] instanceof CubeMap) ? material.uniforms[property] : material._context.getDefaultCubeMap();
                if (info !== Material.DefaultCubeMapId) {
                    this._pathsToMaterials[path] = defaultValue(this._pathsToMaterials[path], []);
                    this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                    if (this._pathsToMaterials[path].length === 1) {
                        when.all([loadImage(info.positiveX), loadImage(info.negativeX), loadImage(info.positiveY), loadImage(info.negativeY), loadImage(info.positiveZ), loadImage(info.negativeZ)]).then(function(images) {
                            texture = material._context.createCubeMap({source : {positiveX : images[0], negativeX : images[1], positiveY : images[2], negativeY : images[3], positiveZ : images[4], negativeZ : images[5]}});
                            that._updateMaterialsOnLoad(texture, path);
                        });
                    }
                }
            }
            return texture;
        },
        registerTextureToMaterial : function(material, property, info) {
            var that = this;
            var path = info;
            var texture = this._pathsToTextures[path];
            if (typeof texture === 'undefined') {
                texture = (material.uniforms[property] instanceof Texture) ? material.uniforms[property] : material._context.getDefaultTexture();
                if (info !== Material.DefaultImageId) {
                    this._pathsToMaterials[path] = defaultValue(this._pathsToMaterials[path], []);
                    this._pathsToMaterials[path].push({'material' : material, 'property' : property});
                    if (this._pathsToMaterials[path].length === 1) {
                        when(loadImage(path), function(image) {
                            texture = material._context.createTexture2D({source : image});
                            that._updateMaterialsOnLoad(texture, path);
                        });
                    }
                }
            }
            return texture;
        }
    };
    Material._materialCache = {
        _materials : {},
        addMaterial : function (materialId, materialTemplate) {
            this._materials[materialId] = materialTemplate;
        },
        getMaterial : function (materialId) {
            return this._materials[materialId];
        }
    };

    Material.DefaultImageId = 'agi_defaultImage';
    Material.DefaultCubeMapId = 'agi_defaultCubeMap';

    Material.ColorId = 'Color';
    Material._materialCache.addMaterial(Material.ColorId, {
        id : Material.ColorId,
        uniforms : {
            color : new Color(1.0, 0.0, 0.0, 0.5)
        },
        components : {
            diffuse : 'color.rgb',
            alpha : 'color.a'
        }
    });

    Material.ImageId = 'Image';
    Material._materialCache.addMaterial(Material.ImageId, {
        id : Material.ImageId,
        uniforms : {
            image : Material.DefaultImageId,
            repeat : {
                x : 1,
                y : 1
            }
        },
        components : {
            diffuse : 'texture2D(image, fract(repeat * materialInput.st)).rgb',
            alpha : 'texture2D(image, fract(repeat * materialInput.st)).a'
        }
    });

    Material.DiffuseMapId = 'DiffuseMap';
    Material._materialCache.addMaterial(Material.DiffuseMapId, {
        id : Material.DiffuseMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channels : 'rgb',
            repeat : {
                x : 1,
                y : 1
            }
        },
        components : {
            diffuse : 'texture2D(image, fract(repeat * materialInput.st)).channels'
        }
    });

    Material.AlphaMapId = 'AlphaMap';
    Material._materialCache.addMaterial(Material.AlphaMapId, {
        id : Material.AlphaMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channel : 'a',
            repeat : {
                x : 1,
                y : 1
            }
        },
        components : {
            alpha : 'texture2D(image, fract(repeat * materialInput.st)).channel'
        }
    });

    Material.SpecularMapId = 'SpecularMap';
    Material._materialCache.addMaterial(Material.SpecularMapId , {
        id : Material.SpecularMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channel : 'r',
            repeat : {
                x : 1,
                y : 1
            }
        },
        components : {
            specular : 'texture2D(image, fract(repeat * materialInput.st)).channel'
        }
    });

    Material.EmissionMapId = 'EmissionMap';
    Material._materialCache.addMaterial(Material.EmissionMapId , {
        id : Material.EmissionMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channels : 'rgb',
            repeat : {
                x : 1,
                y : 1
            }
        },
        components : {
            emission : 'texture2D(image, fract(repeat * materialInput.st)).channels'
        }
    });

    Material.BumpMapId = 'BumpMap';
    Material._materialCache.addMaterial(Material.BumpMapId , {
        id : Material.BumpMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channel : 'r',
            strength : 0.8,
            repeat : {
                x : 1,
                y : 1
            }
        },
        source : BumpMapMaterial
    });

    Material.NormalMapId = 'NormalMap';
    Material._materialCache.addMaterial(Material.NormalMapId, {
        id : Material.NormalMapId,
        uniforms : {
            image : Material.DefaultImageId,
            channels : 'rgb',
            strength : 0.8,
            repeat : {
                x : 1,
                y : 1
            }
        },
        source : NormalMapMaterial
    });

    Material.ReflectionId = 'Reflection';
    Material._materialCache.addMaterial(Material.ReflectionId, {
        id : Material.ReflectionId,
        uniforms : {
            cubeMap : Material.DefaultCubeMapId,
            channels : 'rgb'
        },
        source : ReflectionMaterial
    });

    Material.RefractionId = 'Refraction';
    Material._materialCache.addMaterial(Material.RefractionId, {
        id : Material.RefractionId,
        uniforms : {
            cubeMap : Material.DefaultCubeMapId,
            channels : 'rgb',
            indexOfRefractionRatio : 0.9
        },
        source : RefractionMaterial
    });

    Material.FresnelId = 'Fresnel';
    Material._materialCache.addMaterial(Material.FresnelId , {
        id : Material.FresnelId,
        materials : {
            reflection : {
                id : Material.ReflectionId
            },
            refraction : {
                id : Material.RefractionId
            }
        },
        source : FresnelMaterial
    });

    Material.BrickId = 'Brick';
    Material._materialCache.addMaterial(Material.BrickId, {
        id : Material.BrickId,
        uniforms : {
            brickColor : {
                red: 0.6,
                green: 0.3,
                blue: 0.1,
                alpha: 1.0
            },
            mortarColor : {
                red : 0.8,
                green : 0.8,
                blue : 0.7,
                alpha : 1.0
            },
            brickSize : {
                x : 0.30,
                y : 0.15
            },
            brickPct : {
                x : 0.90,
                y : 0.85
            },
            brickRoughness : 0.2,
            mortarRoughness : 0.1
        },
        source : BrickMaterial
    });

    Material.WoodId = 'Wood';
    Material._materialCache.addMaterial(Material.WoodId, {
        id : Material.WoodId,
        uniforms : {
            lightWoodColor : {
                red : 0.6,
                green : 0.3,
                blue : 0.1,
                alpha : 1.0
            },
            darkWoodColor : {
                red : 0.4,
                green : 0.2,
                blue : 0.07,
                alpha : 1.0
            },
            ringFrequency : 3.0,
            noiseScale : {
                x : 0.7,
                y : 0.5
            },
            grainFrequency : 27.0
        },
        source : WoodMaterial
    });

    Material.AsphaltId = 'Asphalt';
    Material._materialCache.addMaterial(Material.AsphaltId, {
        id : Material.AsphaltId,
        uniforms : {
            asphaltColor : {
                red : 0.15,
                green : 0.15,
                blue : 0.15,
                alpha : 1.0
            },
            bumpSize : 0.02,
            roughness : 0.2
        },
        source : AsphaltMaterial
    });

    Material.CementId = 'Cement';
    Material._materialCache.addMaterial(Material.CementId, {
        id : Material.CementId,
        uniforms : {
            cementColor : {
                red : 0.95,
                green : 0.95,
                blue : 0.85,
                alpha : 1.0
            },
            grainScale : 0.01,
            roughness : 0.3
        },
        source : CementMaterial
    });

    Material.GrassId = 'Grass';
    Material._materialCache.addMaterial(Material.GrassId, {
        id : Material.GrassId,
        uniforms : {
            grassColor : {
                red : 0.25,
                green : 0.4,
                blue : 0.1,
                alpha : 1.0
            },
            dirtColor : {
                red : 0.1,
                green : 0.1,
                blue : 0.1,
                alpha : 1.0
            },
            patchiness : 1.5
        },
        source : GrassMaterial
    });

    Material.StripeId = 'Stripe';
    Material._materialCache.addMaterial(Material.StripeId, {
        id : Material.StripeId,
        uniforms : {
            horizontal : true,
            lightColor : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 0.5
            },
            darkColor : {
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 0.5
            },
            offset : 0.0,
            repeat : 5.0
        },
        source : StripeMaterial
    });

    Material.CheckerboardId = 'Checkerboard';
    Material._materialCache.addMaterial(Material.CheckerboardId, {
        id : Material.CheckerboardId,
        uniforms : {
            lightColor : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 0.5
            },
            darkColor : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.5
            },
            repeat : {
                x : 5.0,
                y : 5.0
            }
        },
        source : CheckerboardMaterial
    });

    Material.DotId = 'Dot';
    Material._materialCache.addMaterial(Material.DotId, {
        id : Material.DotId,
        uniforms : {
            lightColor : {
                red : 1.0,
                green : 1.0,
                blue : 0.0,
                alpha : 0.75
            },
            darkColor : {
                red : 0.0,
                green : 1.0,
                blue : 1.0,
                alpha : 0.75
            },
            repeat : {
                x : 5.0,
                y : 5.0
            }
        },
        source : DotMaterial
    });

    Material.TyeDyeId = 'TieDye';
    Material._materialCache.addMaterial(Material.TyeDyeId, {
        id : Material.TyeDyeId,
        uniforms : {
            lightColor : {
                red : 1.0,
                green : 1.0,
                blue : 0.0,
                alpha : 0.75
            },
            darkColor : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.75
            },
            frequency : 5.0
        },
        source : TieDyeMaterial
    });

    Material.FacetId = 'Facet';
    Material._materialCache.addMaterial(Material.FacetId, {
        id : Material.FacetId,
        uniforms : {
            lightColor : {
                red : 0.25,
                green : 0.25,
                blue : 0.25,
                alpha : 0.75
            },
            darkColor : {
                red : 0.75,
                green : 0.75,
                blue : 0.75,
                alpha : 0.75
            },
            frequency : 10.0
        },
        source : FacetMaterial
    });

    Material.BlobId = 'Blob';
    Material._materialCache.addMaterial(Material.BlobId, {
        id : Material.BlobId,
        uniforms : {
            lightColor : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 0.5
            },
            darkColor : {
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 0.5
            },
            frequency : 10.0
        },
        source : BlobMaterial
    });

    return Material;
});
