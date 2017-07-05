defineSuite([
        'Scene/Cesium3DTileFeatureTable',
        'Core/ComponentDatatype'
    ], function(
        Cesium3DTileFeatureTable,
        ComponentDatatype) {
    'use strict';

    it('loads from JSON', function() {
        var featureTable = new Cesium3DTileFeatureTable({
            TEST : [0, 1, 2, 3, 4, 5]
        });
        featureTable.featuresLength = 3;
        var all = featureTable.getGlobalProperty('TEST', ComponentDatatype.UNSIGNED_BYTE);
        expect(all).toEqual([0, 1, 2, 3, 4, 5]);
        var feature = featureTable.getProperty('TEST', ComponentDatatype.UNSIGNED_BYTE, 2, 1, new Array(2));
        expect(feature).toEqual([2, 3]);
        var properties = featureTable.getPropertyArray('TEST', ComponentDatatype.UNSIGNED_BYTE, 2);
        expect(properties).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('loads from binary', function() {
        var featureTable = new Cesium3DTileFeatureTable({
            TEST : {
                byteOffset : 4
            }
        }, new Uint8Array([0, 0, 0, 0, 0, 1, 2, 3, 4, 5]));
        featureTable.featuresLength = 3;
        var all = featureTable.getGlobalProperty('TEST', ComponentDatatype.UNSIGNED_BYTE, 6);
        expect(all).toEqual([0, 1, 2, 3, 4, 5]);
        var feature = featureTable.getProperty('TEST', ComponentDatatype.UNSIGNED_BYTE, 2, 1, new Array(2));
        expect(feature).toEqual([2, 3]);
        var properties = featureTable.getPropertyArray('TEST', ComponentDatatype.UNSIGNED_BYTE, 2);
        expect(properties).toEqual([0, 1, 2, 3, 4, 5]);
    });
});
