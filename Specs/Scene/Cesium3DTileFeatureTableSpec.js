/*global defineSuite*/
defineSuite([
        'Core/ComponentDatatype',
        'Scene/Cesium3DTileFeatureTable'
    ], function(
        ComponentDatatype,
        Cesium3DTileFeatureTable) {
    'use strict';

    it('getTypedArrayForSemantic throws exception if byteOffset is not defined', function() {
        var featureTable = new Cesium3DTileFeatureTable();
        expect(function() {
            featureTable.getTypedArrayForSemantic('TEST', undefined, ComponentDatatype.UNSIGNED_INT, 5, 1);
        }).toThrowDeveloperError();
    });

    it('getTypedArrayForSemantic throws exception if componentType is not defined', function() {
        var featureTable = new Cesium3DTileFeatureTable();
        expect(function() {
            featureTable.getTypedArrayForSemantic('TEST', 0, undefined, 5, 1);
        }).toThrowDeveloperError();
    });

    it('getTypedArrayForSemantic throws exception if count is not defined', function() {
        var featureTable = new Cesium3DTileFeatureTable();
        expect(function() {
            featureTable.getTypedArrayForSemantic('TEST', 0, ComponentDatatype.UNSIGNED_INT, undefined, 1);
        }).toThrowDeveloperError();
    });

    it('loads from JSON', function() {
        var featureTable = new Cesium3DTileFeatureTable({
            TEST : [0, 1, 2, 3, 4, 5]
        });
        var all = featureTable.getGlobalProperty('TEST', ComponentDatatype.UNSIGNED_BYTE);
        expect(all).toEqual([0, 1, 2, 3, 4, 5]);
        var feature = featureTable.getProperty('TEST', 1, ComponentDatatype.UNSIGNED_BYTE, 2);
        expect(feature).toEqual([2, 3]);
    });

    it('loads from cached array buffer views', function() {
        var featureTable = new Cesium3DTileFeatureTable({
            TEST : {
                byteOffset : Number.POSITIVE_INFINITY
            }
        });
        featureTable._cachedArrayBufferViews.TEST = new Uint8Array([0, 1, 2, 3, 4, 5]);
        var all = featureTable.getGlobalProperty('TEST', ComponentDatatype.UNSIGNED_BYTE, 5);
        expect(all).toEqual([0, 1, 2, 3, 4]);
        var feature = featureTable.getProperty('TEST', 1, ComponentDatatype.UNSIGNED_BYTE, 2);
        expect(feature).toEqual([2, 3]);
    });

    it('loads from JSON byteOffset', function() {
        var featureTable = new Cesium3DTileFeatureTable({
            TEST : {
                byteOffset : 4
            }
        }, new Uint8Array([0, 0, 0, 0, 0, 1, 2, 3, 4, 5]));
        var all = featureTable.getGlobalProperty('TEST', ComponentDatatype.UNSIGNED_BYTE, 5);
        expect(all).toEqual([0, 1, 2, 3, 4]);
        var feature = featureTable.getProperty('TEST', 1, ComponentDatatype.UNSIGNED_BYTE, 2);
        expect(feature).toEqual([2, 3]);
    });
});