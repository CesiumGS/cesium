/*global define*/
define([
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError'
    ], function(
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTileFeatureTableResources(featureTableJSON, featureTableBinary) {
        this.json = featureTableJSON;
        this.buffer = featureTableBinary;
        this._cachedArrayBufferViews = {};
        this.featuresLength = 0;
    }

    Cesium3DTileFeatureTableResources.prototype.getTypedArrayForSemantic = function(semantic, byteOffset, componentType, count, featureSize) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(byteOffset)) {
            throw new DeveloperError('byteOffset must be defined to read from binary data for semantic: ' + semantic);
        }
        if (!defined(componentType)) {
            throw new DeveloperError('componentType must be defined to read from binary data for semantic: ' + semantic);
        }
        if (!defined(count)) {
            throw new DeveloperError('count must be defined to read from binary data for semantic: ' + semantic);
        }
        //>>includeEnd('debug');
        var cachedArrayBufferViews = this._cachedArrayBufferViews;
        var arrayBuffer = cachedArrayBufferViews[semantic];
        if (!defined(arrayBuffer)) {
            arrayBuffer = ComponentDatatype.createArrayBufferView(componentType, this.buffer.buffer, this.buffer.byteOffset + byteOffset, count * featureSize);
            cachedArrayBufferViews[semantic] = arrayBuffer;
        }
        return arrayBuffer;
    };

    Cesium3DTileFeatureTableResources.prototype.getGlobalProperty = function(semantic, componentType, count) {
        var jsonValue = this.json[semantic];
        if (defined(jsonValue)) {
            var byteOffset = jsonValue.byteOffset;
            if (defined(byteOffset)) {
                // This is a reference to the binary
                count = defaultValue(count, 1);
                var typedArray = this.getTypedArrayForSemantic(semantic, byteOffset, componentType, count, 1);
                var subArray = typedArray.subarray(0, count);
                if (subArray.length === 1) {
                    return subArray[0];
                }
                return subArray;
            }
        }
        return jsonValue;
    };

    Cesium3DTileFeatureTableResources.prototype.getPropertyArray = function(semantic, componentType, featureSize) {
        var jsonValue = this.json[semantic];
        if (defined(jsonValue)) {
            var byteOffset = jsonValue.byteOffset;
            if (defined(byteOffset)) {
                // This is a reference to the binary
                featureSize = defaultValue(featureSize, 1);
                return this.getTypedArrayForSemantic(semantic, byteOffset, componentType, this.featuresLength, featureSize);
            }
            // If the data is a json array, convert to a typed array
            return ComponentDatatype.createTypedArray(componentType, jsonValue);
        }
        return jsonValue;
    };

    Cesium3DTileFeatureTableResources.prototype.getProperty = function(semantic, featureId, componentType, featureSize) {
        var jsonValue = this.json[semantic];
        if (defined(jsonValue)) {
            var byteOffset = jsonValue.byteOffset;
            if (defined(byteOffset)) {
                // This is a reference to the binary
                featureSize = defaultValue(featureSize, 1);
                var typedArray = this.getTypedArrayForSemantic(semantic, byteOffset, componentType, this.featuresLength, featureSize);
                var subArray = typedArray.subarray(featureId * featureSize, featureId * featureSize + featureSize);
                if (subArray.length === 1) {
                    return subArray[0];
                }
                return subArray;
            }
        }
        if (Array.isArray(jsonValue)) {
            return jsonValue.slice(featureId * featureSize, featureId * featureSize + featureSize);
        }
        return jsonValue;
    };

    return Cesium3DTileFeatureTableResources;
});