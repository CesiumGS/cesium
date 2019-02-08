defineSuite([
        'Core/SerializedMapProjection',
        'Core/MapProjectionType'
    ], function(
        SerializedMapProjection,
        MapProjectionType) {
    'use strict';

    it('throws an error when mapProjectionType is not provided', function() {
        expect(function() {
            return new SerializedMapProjection();
        }).toThrowError();
    });

    it('throws an error when json is not provided', function() {
        expect(function() {
            return new SerializedMapProjection(MapProjectionType.GEOGRAPHIC);
        }).toThrowError();
    });
});
