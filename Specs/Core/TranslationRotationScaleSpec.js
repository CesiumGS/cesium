defineSuite([
        'Core/TranslationRotationScale',
        'Core/Cartesian3',
        'Core/Quaternion'
    ], function(
        TranslationRotationScale,
        Cartesian3,
        Quaternion) {
    'use strict';

    it('sets correct values when constructed with no arguments', function() {
        var transformation = new TranslationRotationScale();

        expect(transformation.translation).toEqual(Cartesian3.ZERO);
        expect(transformation.rotation).toEqual(Quaternion.IDENTITY);
        expect(transformation.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
    });

    it('sets correct values when constructed with arguments', function() {
        var translation = Cartesian3.UNIT_Y;
        var rotation = new Quaternion(0.5, 0.5, 0.5, 0.5);
        var scale = Cartesian3.UNIT_X;

        var transformation = new TranslationRotationScale(translation, rotation, scale);

        expect(transformation.translation).toEqual(translation);
        expect(transformation.rotation).toEqual(rotation);
        expect(transformation.scale).toEqual(scale);
    });

    it('has a working equals function', function() {
        var left = new TranslationRotationScale();
        left.translation = Cartesian3.UNIT_Y;
        left.rotation = new Quaternion(0.5, 0.5, 0.5, 0.5);
        left.scale = Cartesian3.UNIT_X;

        var right = new TranslationRotationScale();
        right.translation = Cartesian3.UNIT_Y;
        right.rotation = new Quaternion(0.5, 0.5, 0.5, 0.5);
        right.scale = Cartesian3.UNIT_X;
        expect(left.equals(right)).toEqual(true);

        right.scale = Cartesian3.ZERO;
        expect(left.equals(right)).toEqual(false);

        right.scale = Cartesian3.UNIT_X;
        right.translation = Cartesian3.ZERO;
        expect(left.equals(right)).toEqual(false);

        right.translation = Cartesian3.UNIT_Y;
        right.rotation = Quaternion.ZERO;
        expect(left.equals(right)).toEqual(false);
    });
});
