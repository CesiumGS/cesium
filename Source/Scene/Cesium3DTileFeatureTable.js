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
        class Cesium3DTileFeatureTable {
            constructor(featureTableJson, featureTableBinary) {
                this.json = featureTableJson;
                this.buffer = featureTableBinary;
                this._cachedTypedArrays = {};
                this.featuresLength = 0;
            }
            getGlobalProperty(semantic, componentType, componentLength) {
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
            }
            getPropertyArray(semantic, componentType, componentLength) {
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
            }
            getProperty(semantic, componentType, componentLength, featureId, result) {
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
            }
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




    return Cesium3DTileFeatureTable;
});
