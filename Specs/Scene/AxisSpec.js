/*global defineSuite*/
defineSuite([
    'Scene/Axis',
    'Core/Cartesian4',
    'Core/Math',
    'Core/Matrix3',
    'Core/Matrix4'
], function(
    Axis,
    Cartesian4,
    CesiumMath,
    Matrix3,
    Matrix4) {
    'use strict';

    it('Convert y-up to z-up', function() {
        var upAxis = Cartesian4.UNIT_Y;
        var transformation = Axis.Y_UP_TO_Z_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_Z, CesiumMath.EPSILON1);
    });

    it('Convert y-up to x-up', function() {
        var upAxis = Cartesian4.UNIT_Y;
        var transformation = Axis.Y_UP_TO_X_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_X, CesiumMath.EPSILON1);
    });

    it('Convert z-up to x-up', function() {
        var upAxis = Cartesian4.UNIT_Z;
        var transformation = Axis.Z_UP_TO_X_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_X, CesiumMath.EPSILON1);
    });

    it('Convert z-up to y-up', function() {
        var upAxis = Cartesian4.UNIT_Z;
        var transformation = Axis.Z_UP_TO_Y_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_Y, CesiumMath.EPSILON1);
    });

    it('Convert x-up to y-up', function() {
        var upAxis = Cartesian4.UNIT_X;
        var transformation = Axis.X_UP_TO_Y_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_Y, CesiumMath.EPSILON1);
    });

    it('Convert x-up to z-up', function() {
        var upAxis = Cartesian4.UNIT_X;
        var transformation = Axis.X_UP_TO_Z_UP;
        var transformed = new Cartesian4();
        Matrix4.multiplyByVector(transformation, upAxis, transformed);
        var result = new Cartesian4();
        Cartesian4.normalize(transformed, result);
        expect(result).toEqualEpsilon(Cartesian4.UNIT_Z, CesiumMath.EPSILON1);
    });

}, 'WebGL');
