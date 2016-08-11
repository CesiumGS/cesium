/*global defineSuite*/
defineSuite([
        'Core/PointGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3'
    ], function(
        PointGeometry,
        BoundingSphere,
        Cartesian3) {
    'use strict';

    var positionsTypedArray = new Float32Array([0.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
    var colorsTypedArray = new Uint8Array([255, 0, 0, 0, 255, 0]);
    var boundingSphere = BoundingSphere.fromVertices(positionsTypedArray);
    var expectedCenter = new Cartesian3(0.0, 0.0, 0.5);
    var expectedRadius = 0.5;

    it('throws without positionsTypedArray', function() {
        expect(function() {
            return new PointGeometry({
                colorsTypedArray : colorsTypedArray
            });
        }).toThrowDeveloperError();
    });

    it('throws without colorsTypedArray', function() {
        expect(function() {
            return new PointGeometry({
                positionsTypedArray : positionsTypedArray
            });
        }).toThrowDeveloperError();
    });

    it('creates with boundingSphere', function() {
        var points = new PointGeometry({
            positionsTypedArray : positionsTypedArray,
            colorsTypedArray : colorsTypedArray,
            boundingSphere : boundingSphere
        });

        var geometry = PointGeometry.createGeometry(points);
        expect(geometry.boundingSphere.center).toEqual(expectedCenter);
        expect(geometry.boundingSphere.radius).toEqual(expectedRadius);
    });

    it('creates without boundingSphere', function() {
        var points = new PointGeometry({
            positionsTypedArray : positionsTypedArray,
            colorsTypedArray : colorsTypedArray
        });

        var geometry = PointGeometry.createGeometry(points);
        expect(geometry.boundingSphere.center).toEqual(expectedCenter);
        expect(geometry.boundingSphere.radius).toEqual(expectedRadius);
    });

    it('computes all vertex attributes', function() {
        var points = new PointGeometry({
            positionsTypedArray : positionsTypedArray,
            colorsTypedArray : colorsTypedArray,
            boundingSphere : boundingSphere
        });

        var geometry = PointGeometry.createGeometry(points);
        expect(geometry.attributes.position.values.length).toEqual(2 * 3);
        expect(geometry.attributes.color.values.length).toEqual(2 * 3);
        expect(geometry.indices).toBeUndefined();
    });
});
