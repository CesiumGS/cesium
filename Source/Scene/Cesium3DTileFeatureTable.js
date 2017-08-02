define([
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        ComponentDatatype,
        defaultValue,
        defined) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTileFeatureTable(featureTableJson, featureTableBinary) {
        this.json = featureTableJson;
        this.buffer = featureTableBinary;
        this._cachedTypedArrays = {};
        this.featuresLength = 0;
    }

    function getTypedArrayFromBinary(featureTable, semantic, componentType, componentLength, count, byteOffset) {
        var cachedTypedArrays = featureTable._cachedTypedArrays;
        var typedArray = cachedTypedArrays[semantic];
        if (!defined(typedArray)) {
            typedArray = ComponentDatatype.createArrayBufferView(componentType, featureTable.buffer.buffer, featureTable.buffer.byteOffset + byteOffset, count * componentLength);
            cachedTypedArrays[semantic] = typedArray;
        }
        return typedArray;
    }

    function getTypedArrayFromArray(featureTable, semantic, componentType, array) {
        var cachedTypedArrays = featureTable._cachedTypedArrays;
        var typedArray = cachedTypedArrays[semantic];
        if (!defined(typedArray)) {
            typedArray = ComponentDatatype.createTypedArray(componentType, array);
            cachedTypedArrays[semantic] = typedArray;
        }
        return typedArray;
    }

    Cesium3DTileFeatureTable.prototype.getGlobalProperty = function(semantic, componentType, componentLength) {
        var jsonValue = this.json[semantic];
        if (!defined(jsonValue)) {
            return undefined;
        }

        if (defined(jsonValue.byteOffset)) {
            componentType = defaultValue(componentType, ComponentDatatype.UNSIGNED_INT);
            componentLength = defaultValue(componentLength, 1);
            return getTypedArrayFromBinary(this, semantic, componentType, componentLength, 1, jsonValue.byteOffset);
        }

        return jsonValue;
    };

    Cesium3DTileFeatureTable.prototype.getPropertyArray = function(semantic, componentType, componentLength) {
        var jsonValue = this.json[semantic];
        if (!defined(jsonValue)) {
            return undefined;
        }

        if (defined(jsonValue.byteOffset)) {
            if (defined(jsonValue.componentType)) {
                componentType = ComponentDatatype.fromName(jsonValue.componentType);
            }
            return getTypedArrayFromBinary(this, semantic, componentType, componentLength, this.featuresLength, jsonValue.byteOffset);
        }

        return getTypedArrayFromArray(this, semantic, componentType, jsonValue);
    };

    Cesium3DTileFeatureTable.prototype.getProperty = function(semantic, componentType, componentLength, featureId, result) {
        var jsonValue = this.json[semantic];
        if (!defined(jsonValue)) {
            return undefined;
        }

        var typedArray = this.getPropertyArray(semantic, componentType, componentLength);

        if (componentLength === 1) {
            return typedArray[featureId];
        }

        for (var i = 0; i < componentLength; ++i) {
            result[i] = typedArray[componentLength * featureId + i];
        }

        return result;
    };

    return Cesium3DTileFeatureTable;
});
