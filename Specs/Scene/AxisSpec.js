defineSuite([
        'Scene/Axis',
        'Core/Cartesian4',
        'Core/Math',
        'Core/Matrix4'
    ], function(
        Axis,
        Cartesian4,
        CesiumMath,
        Matrix4) {
    'use strict';

    function convertUpAxis(upAxis, transformation, expected) {
        var transformed = Matrix4.multiplyByVector(transformation, upAxis, new Cartesian4());
        Cartesian4.normalize(transformed, transformed);
        expect(transformed).toEqualEpsilon(expected, CesiumMath.EPSILON1);
    }

    it('Convert y-up to z-up', function() {
        convertUpAxis(Cartesian4.UNIT_Y, Axis.Y_UP_TO_Z_UP, Cartesian4.UNIT_Z);
    });

    it('Convert y-up to x-up', function() {
        convertUpAxis(Cartesian4.UNIT_Y, Axis.Y_UP_TO_X_UP, Cartesian4.UNIT_X);
    });

    it('Convert z-up to x-up', function() {
        convertUpAxis(Cartesian4.UNIT_Z, Axis.Z_UP_TO_X_UP, Cartesian4.UNIT_X);
    });

    it('Convert z-up to y-up', function() {
        convertUpAxis(Cartesian4.UNIT_Z, Axis.Z_UP_TO_Y_UP, Cartesian4.UNIT_Y);
    });

    it('Convert x-up to y-up', function() {
        convertUpAxis(Cartesian4.UNIT_X, Axis.X_UP_TO_Y_UP, Cartesian4.UNIT_Y);
    });

    it('Convert x-up to z-up', function() {
        convertUpAxis(Cartesian4.UNIT_X, Axis.X_UP_TO_Z_UP, Cartesian4.UNIT_Z);
    });
});
