/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defined',
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

    function getEntryType(attributes, attributeIndex) {
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

    var scratchgetEntryCartesian4 = new Cartesian4();

    BatchTable.prototype.getEntry = function(instanceIndex, attributeIndex, result) {
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
        var value = Cartesian4.unpack(this._batchValues, index, scratchgetEntryCartesian4);

        var entryType = getEntryType(attributes, attributeIndex);
        if (defined(entryType.fromCartesian4)) {
            return entryType.fromCartesian4(value, result);
        } else if (defined(entryType.clone)) {
            return entryType.clone(value, result);
        }

        return value.x;
    };

    var setEntryScratchValues = [undefined, undefined, new Cartesian2(), new Cartesian3(), new Cartesian4()];
    var setEntryScratchCartesian4 = new Cartesian4();

    BatchTable.prototype.setEntry = function(instanceIndex, attributeIndex, value) {
        //>>includeStart('debug', pragmas.debug);
        if (instanceIndex < 0 || instanceIndex >= this._numberOfInstances) {
            throw new DeveloperError('instanceIndex is out of range.');
        }
        if (attributeIndex < 0 || attributeIndex >= this._attributes.length) {
            throw new DeveloperError('attributeIndex is out of range');
        }
        //>>includeEnd('debug');

        var attributes = this._attributes;
        var result = setEntryScratchValues[attributes[attributeIndex].componentsPerAttribute];
        var currentEntry = this.getEntry(instanceIndex, attributeIndex, result);
        var entryType = getEntryType(this._attributes, attributeIndex);
        var entriesEqual = defined(entryType.equals) ? entryType.equals(currentEntry, value) : currentEntry === value;
        if (entriesEqual) {
            return;
        }

        var entryValue = setEntryScratchCartesian4;
        entryValue.x = defined(value.x) ? value.x : value;
        entryValue.y = defined(value.y) ? value.y : 0.0;
        entryValue.z = defined(value.z) ? value.z : 0.0;
        entryValue.w = defined(value.w) ? value.w : 0.0;

        var index = 4 * attributes.length * instanceIndex + 4 * attributeIndex;
        Cartesian4.pack(entryValue, this._batchValues, index);

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

    BatchTable.prototype.update = function(frameState) {
        var context = frameState.context;
        if (this._pixelDatatype === PixelDatatype.FLOAT && !context.floatingPointTexture) {
            // TODO: We could probably pack the floats to RGBA unsigned bytes but that would add a lot CPU and memory overhead.
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
        }

        glslFunction +=
            '    return value; \n' +
            '} \n';
        return glslFunction;
    }

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

    BatchTable.prototype.isDestroyed = function() {
        return false;
    };

    BatchTable.prototype.destroy = function() {
        this._texture = this._texture && this._texture.destroy();
        return destroyObject(this);
    };

    return BatchTable;
});