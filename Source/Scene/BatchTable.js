/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/PixelFormat',
        '../Core/RuntimeError',
        '../Renderer/ContextLimits',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        combine,
        ComponentDatatype,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        PixelFormat,
        RuntimeError,
        ContextLimits,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter) {
    'use strict';

    /**
     * Creates a texture to look up per instance attributes for batched primitives. For example, store each primitive's pick color in the texture.
     *
     * @alias BatchTable
     * @constructor
     * @private
     *
     * @param {Object[]} attributes An array of objects describing a per instance attribute. Each object contains a datatype, components per attributes, whether it is normalized and a function name
     *     to retrieve the value in the vertex shader.
     * @param {Number} numberOfInstances The number of instances in a batch table.
     *
     * @example
     * // create the batch table
     * var attributes = [{
     *     functionName : 'getShow',
     *     componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
     *     componentsPerAttribute : 1
     * }, {
     *     functionName : 'getPickColor',
     *     componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
     *     componentsPerAttribute : 4,
     *     normalize : true
     * }];
     * var batchTable = new BatchTable(attributes, 5);
     *
     * // when creating the draw commands, update the uniform map and the vertex shader
     * vertexShaderSource = batchTable.getVertexShaderCallback()(vertexShaderSource);
     * var shaderProgram = ShaderProgram.fromCache({
     *    // ...
     *    vertexShaderSource : vertexShaderSource,
     * });
     *
     * drawCommand.shaderProgram = shaderProgram;
     * drawCommand.uniformMap = batchTable.getUniformMapCallback()(uniformMap);
     *
     * // use the attribute function names in the shader to retrieve the instance values
     * // ...
     * attribute float batchId;
     *
     * void main() {
     *     // ...
     *     float show = getShow(batchId);
     *     vec3 pickColor = getPickColor(batchId);
     *     // ...
     * }
     */
    function BatchTable(attributes, numberOfInstances) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(attributes)) {
            throw new DeveloperError('attributes is required');
        }
        if (!defined(numberOfInstances)) {
            throw new DeveloperError('numberOfInstances is required');
        }
        //>>includeEnd('debug');

        this._attributes = attributes;
        this._numberOfInstances = numberOfInstances;

        var pixelDatatype = getDatatype(attributes);

        var numberOfAttributes = attributes.length;
        var maxNumberOfInstancesPerRow = Math.floor(ContextLimits.maximumTextureSize / numberOfAttributes);

        var instancesPerWidth = Math.min(numberOfInstances, maxNumberOfInstancesPerRow);
        var width = numberOfAttributes * instancesPerWidth;
        var height = Math.ceil(numberOfInstances / instancesPerWidth);

        var stepX = 1.0 / width;
        var centerX = stepX * 0.5;
        var stepY = 1.0 / height;
        var centerY = stepY * 0.5;

        this._textureDimensions = new Cartesian2(width, height);
        this._textureStep = new Cartesian4(stepX, centerX, stepY, centerY);
        this._pixelDatatype = pixelDatatype;
        this._texture = undefined;

        var batchLength = width * height * 4;
        this._batchValues = pixelDatatype === PixelDatatype.FLOAT ? new Float32Array(batchLength) : new Uint8Array(batchLength);
        this._batchValuesDirty = false;
    }

    defineProperties(BatchTable.prototype, {
        /**
         * The attribute descriptions.
         * @memberOf BatchTable.prototype
         * @type {Object[]}
         * @readonly
         */
        attributes : {
            get : function() {
                return this._attributes;
            }
        },
        /**
         * The number of instances.
         * @memberOf BatchTable.prototype
         * @type {Number}
         * @readonly
         */
        numberOfInstances : {
            get : function () {
                return this._numberOfInstances;
            }
        }
    });

    function getDatatype(attributes) {
        var foundFloatDatatype = false;
        var length = attributes.length;
        for (var i = 0; i < length; ++i) {
            if (attributes[i].componentDatatype !== ComponentDatatype.UNSIGNED_BYTE) {
                foundFloatDatatype = true;
            }
        }
        return foundFloatDatatype ? PixelDatatype.FLOAT : PixelDatatype.UNSIGNED_BYTE;
    }

    function getAttributeType(attributes, attributeIndex) {
        var componentsPerAttribute = attributes[attributeIndex].componentsPerAttribute;
        if (componentsPerAttribute === 2) {
            return Cartesian2;
        } else if (componentsPerAttribute === 3) {
            return Cartesian3;
        } else if (componentsPerAttribute === 4) {
            return Cartesian4;
        }
        return Number;
    }

    var scratchGetAttributeCartesian4 = new Cartesian4();

    /**
     * Gets the value of an attribute in the table.
     *
     * @param {Number} instanceIndex The index of the instance.
     * @param {Number} attributeIndex The index of the attribute.
     * @param {undefined|Cartesian2|Cartesian3|Cartesian4} [result] The object onto which to store the result. The type is dependent on the attribute's number of components.
     * @returns {Number|Cartesian2|Cartesian3|Cartesian4} The attribute value stored for the instance.
     *
     * @exception {DeveloperError} instanceIndex is out of range.
     * @exception {DeveloperError} attributeIndex is out of range.
     */
    BatchTable.prototype.getBatchedAttribute = function(instanceIndex, attributeIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (instanceIndex < 0 || instanceIndex >= this._numberOfInstances) {
            throw new DeveloperError('instanceIndex is out of range.');
        }
        if (attributeIndex < 0 || attributeIndex >= this._attributes.length) {
            throw new DeveloperError('attributeIndex is out of range');
        }
        //>>includeEnd('debug');

        var attributes = this._attributes;
        var index = 4 * attributes.length * instanceIndex + 4 * attributeIndex;
        var value = Cartesian4.unpack(this._batchValues, index, scratchGetAttributeCartesian4);

        var attributeType = getAttributeType(attributes, attributeIndex);
        if (defined(attributeType.fromCartesian4)) {
            return attributeType.fromCartesian4(value, result);
        } else if (defined(attributeType.clone)) {
            return attributeType.clone(value, result);
        }

        return value.x;
    };

    var setAttributeScratchValues = [undefined, undefined, new Cartesian2(), new Cartesian3(), new Cartesian4()];
    var setAttributeScratchCartesian4 = new Cartesian4();

    /**
     * Sets the value of an attribute in the table.
     *
     * @param {Number} instanceIndex The index of the instance.
     * @param {Number} attributeIndex The index of the attribute.
     * @param {Number|Cartesian2|Cartesian3|Cartesian4} value The value to be stored in the table. The type of value will depend on the number of components of the attribute.
     *
     * @exception {DeveloperError} instanceIndex is out of range.
     * @exception {DeveloperError} attributeIndex is out of range.
     */
    BatchTable.prototype.setBatchedAttribute = function(instanceIndex, attributeIndex, value) {
        //>>includeStart('debug', pragmas.debug);
        if (instanceIndex < 0 || instanceIndex >= this._numberOfInstances) {
            throw new DeveloperError('instanceIndex is out of range.');
        }
        if (attributeIndex < 0 || attributeIndex >= this._attributes.length) {
            throw new DeveloperError('attributeIndex is out of range');
        }
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var attributes = this._attributes;
        var result = setAttributeScratchValues[attributes[attributeIndex].componentsPerAttribute];
        var currentAttribute = this.getBatchedAttribute(instanceIndex, attributeIndex, result);
        var attributeType = getAttributeType(this._attributes, attributeIndex);
        var entriesEqual = defined(attributeType.equals) ? attributeType.equals(currentAttribute, value) : currentAttribute === value;
        if (entriesEqual) {
            return;
        }

        var attributeValue = setAttributeScratchCartesian4;
        attributeValue.x = defined(value.x) ? value.x : value;
        attributeValue.y = defined(value.y) ? value.y : 0.0;
        attributeValue.z = defined(value.z) ? value.z : 0.0;
        attributeValue.w = defined(value.w) ? value.w : 0.0;

        var index = 4 * attributes.length * instanceIndex + 4 * attributeIndex;
        Cartesian4.pack(attributeValue, this._batchValues, index);

        this._batchValuesDirty = true;
    };

    function createTexture(batchTable, context) {
        var dimensions = batchTable._textureDimensions;
        batchTable._texture = new Texture({
            context : context,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : batchTable._pixelDatatype,
            width : dimensions.x,
            height : dimensions.y,
            sampler : new Sampler({
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
    }

    function updateTexture(batchTable) {
        var dimensions = batchTable._textureDimensions;
        batchTable._texture.copyFrom({
            width : dimensions.x,
            height : dimensions.y,
            arrayBufferView : batchTable._batchValues
        });
    }

    /**
     * Creates/updates the batch table texture.
     * @param {FrameState} frameState The frame state.
     *
     * @exception {RuntimeError} The floating point texture extension is required but not supported.
     */
    BatchTable.prototype.update = function(frameState) {
        var context = frameState.context;
        if (this._pixelDatatype === PixelDatatype.FLOAT && !context.floatingPointTexture) {
            // We could probably pack the floats to RGBA unsigned bytes but that would add a lot CPU and memory overhead.
            throw new RuntimeError('The floating point texture extension is required but not supported.');
        }

        if (defined(this._texture) && !this._batchValuesDirty) {
            return;
        }

        this._batchValuesDirty = false;

        if (!defined(this._texture)) {
            createTexture(this, context);
        }
        updateTexture(this);
    };

    /**
     * Gets a function that will update a uniform map to contain values for looking up values in the batch table.
     *
     * @returns {BatchTable~updateUniformMapCallback} A callback for updating uniform maps.
     */
    BatchTable.prototype.getUniformMapCallback = function() {
        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                batchTexture : function() {
                    return that._texture;
                },
                batchTextureDimensions : function() {
                    return that._textureDimensions;
                },
                batchTextureStep : function() {
                    return that._textureStep;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    };

    function getGlslComputeSt(batchTable) {
        var numberOfAttributes = batchTable._attributes.length;

        // GLSL batchId is zero-based: [0, numberOfInstances - 1]
        if (batchTable._textureDimensions.y === 1) {
            return 'uniform vec4 batchTextureStep; \n' +
                   'vec2 computeSt(float batchId) \n' +
                   '{ \n' +
                   '    float stepX = batchTextureStep.x; \n' +
                   '    float centerX = batchTextureStep.y; \n' +
                   '    float numberOfAttributes = float('+ numberOfAttributes + '); \n' +
                   '    return vec2(centerX + (batchId * numberOfAttributes * stepX), 0.5); \n' +
                   '} \n';
        }

        return 'uniform vec4 batchTextureStep; \n' +
               'uniform vec2 batchTextureDimensions; \n' +
               'vec2 computeSt(float batchId) \n' +
               '{ \n' +
               '    float stepX = batchTextureStep.x; \n' +
               '    float centerX = batchTextureStep.y; \n' +
               '    float stepY = batchTextureStep.z; \n' +
               '    float centerY = batchTextureStep.w; \n' +
               '    float numberOfAttributes = float('+ numberOfAttributes + '); \n' +
               '    float xId = mod(batchId * numberOfAttributes, batchTextureDimensions.x); \n' +
               '    float yId = floor(batchId * numberOfAttributes / batchTextureDimensions.x); \n' +
               '    return vec2(centerX + (xId * stepX), 1.0 - (centerY + (yId * stepY))); \n' +
               '} \n';
    }

    function getComponentType(componentsPerAttribute) {
        if (componentsPerAttribute === 1) {
            return 'float';
        }
        return 'vec' + componentsPerAttribute;
    }

    function getComponentSwizzle(componentsPerAttribute) {
        if (componentsPerAttribute === 1) {
            return '.x';
        } else if (componentsPerAttribute === 2) {
            return '.xy';
        } else if (componentsPerAttribute === 3) {
            return '.xyz';
        }
        return '';
    }

    function getGlslAttributeFunction(batchTable, attributeIndex) {
        var attributes = batchTable._attributes;
        var attribute = attributes[attributeIndex];
        var componentsPerAttribute = attribute.componentsPerAttribute;
        var functionName = attribute.functionName;
        var functionReturnType = getComponentType(componentsPerAttribute);
        var functionReturnValue = getComponentSwizzle(componentsPerAttribute);

        var glslFunction =
            functionReturnType + ' ' + functionName + '(float batchId) \n' +
            '{ \n' +
            '    vec2 st = computeSt(batchId); \n' +
            '    st.x += batchTextureStep.x * float(' + attributeIndex + '); \n' +
            '    vec4 textureValue = texture2D(batchTexture, st); \n' +
            '    ' + functionReturnType + ' value = textureValue' + functionReturnValue + '; \n';

        if (batchTable._pixelDatatype === PixelDatatype.UNSIGNED_BYTE && !attribute.normalize) {
            glslFunction += 'value *= 255.0; \n';
        } else if (batchTable._pixelDatatype === PixelDatatype.FLOAT && attribute.componentDatatype === ComponentDatatype.UNSIGNED_BYTE && attribute.normalize) {
            glslFunction += 'value /= 255.0; \n';
        }

        glslFunction +=
            '    return value; \n' +
            '} \n';
        return glslFunction;
    }

    /**
     * Gets a function that will update a vertex shader to contain functions for looking up values in the batch table.
     *
     * @returns {BatchTable~updateVertexShaderSourceCallback} A callback for updating a vertex shader source.
     */
    BatchTable.prototype.getVertexShaderCallback = function() {
        var batchTableShader = 'uniform sampler2D batchTexture; \n';
        batchTableShader += getGlslComputeSt(this) + '\n';

        var attributes = this._attributes;
        var length = attributes.length;
        for (var i = 0; i < length; ++i) {
            batchTableShader += getGlslAttributeFunction(this, i);
        }

        return function(source) {
            var mainIndex = source.indexOf('void main');
            var beforeMain = source.substring(0, mainIndex);
            var afterMain = source.substring(mainIndex);
            return beforeMain + '\n' + batchTableShader + '\n' + afterMain;
        };
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see BatchTable#destroy
     */
    BatchTable.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see BatchTable#isDestroyed
     */
    BatchTable.prototype.destroy = function() {
        this._texture = this._texture && this._texture.destroy();
        return destroyObject(this);
    };

    /**
     * A callback for updating uniform maps.
     * @callback BatchTable~updateUniformMapCallback
     *
     * @param {Object} uniformMap The uniform map.
     * @returns {Object} The new uniform map with properties for retrieving values from the batch table.
     */

    /**
     * A callback for updating a vertex shader source.
     * @callback BatchTable~updateVertexShaderSourceCallback
     *
     * @param {String} vertexShaderSource The vertex shader source.
     * @returns {String} The new vertex shader source with the functions for retrieving batch table values injected.
     */

    return BatchTable;
});