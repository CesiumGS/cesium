defineSuite([
        'Core/EllipseOutlineGeometry',
        'Core/arrayFill',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/GeometryOffsetAttribute',
        'Core/Math',
        'Specs/createPackableSpecs'
    ], function(
        EllipseOutlineGeometry,
        arrayFill,
        Cartesian3,
        Ellipsoid,
        GeometryOffsetAttribute,
        CesiumMath,
        createPackableSpecs) {
    'use strict';

    it('throws without a center', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMinorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws without a semiMinorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws with a negative granularity', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 1.0,
                granularity : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when semiMajorAxis is less than the semiMajorAxis', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 1.0,
                semiMinorAxis : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('throws when width < 1.0', function() {
        expect(function() {
            return new EllipseOutlineGeometry({
                center : Cartesian3.fromDegrees(0,0),
                semiMajorAxis : 2.0,
                semiMinorAxis : 1.0,
                width : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
        expect(m.boundingSphere.radius).toEqualEpsilon(1, CesiumMath.EPSILON6);
    });

    it('computes positions extruded', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 5.0
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes offset attribute', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for top vertices', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 5.0,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);

        var seenZero = false;
        var seenOne = false;
        var seenOther = false;
        for (var i = 0; i < offset.length; ++i) {
            seenZero = seenZero || offset[i] === 0.0;
            seenOne = seenOne || offset[i] === 1.0;
            seenOther = seenOther || (offset[i] !== 0.0 && offset[i] !== 1.0);
        }
        expect(seenZero).toEqual(true);
        expect(seenOne).toEqual(true);
        expect(seenOther).toEqual(false);
    });

    it('computes offset attribute extruded for all vertices', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 5.0,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes positions extruded, no lines drawn between top and bottom', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0,
            extrudedHeight : 5.0,
            numberOfVerticalLines : 0
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('undefined is returned if the minor axis is equal to or less than zero', function() {
        var ellipseOutline0 = new EllipseOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 300000.0,
            semiMinorAxis : 0.0
        });
        var ellipseOutline1 = new EllipseOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 0.0,
            semiMinorAxis : -1.0
        });
        var ellipseOutline2 = new EllipseOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : 300000.0,
            semiMinorAxis : -10.0
        });
        var ellipseOutline3 = new EllipseOutlineGeometry({
            center : Cartesian3.fromDegrees(-75.59777, 40.03883),
            semiMajorAxis : -1.0,
            semiMinorAxis : -2.0
        });

        var geometry0 = EllipseOutlineGeometry.createGeometry(ellipseOutline0);
        var geometry1 = EllipseOutlineGeometry.createGeometry(ellipseOutline1);
        var geometry2 = EllipseOutlineGeometry.createGeometry(ellipseOutline2);
        var geometry3 = EllipseOutlineGeometry.createGeometry(ellipseOutline3);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
        expect(geometry3).toBeUndefined();
    });

    var center = new Cartesian3(8, 9, 10);
    var ellipsoid = new Ellipsoid(11, 12, 13);
    var packableInstance = new EllipseOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        semiMinorAxis : 2,
        semiMajorAxis : 3,
        numberOfVerticalLines : 4,
        height : 5,
        rotation : 6,
        extrudedHeight : 7,
        width : 8
    });
    var packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 7, 1, 5, 4, 8, -1];
    createPackableSpecs(EllipseOutlineGeometry, packableInstance, packedInstance, 'extruded');

    //Because extrudedHeight is optional and has to be taken into account when packing, we have a second test without it.
    packableInstance = new EllipseOutlineGeometry({
        ellipsoid : ellipsoid,
        center : center,
        granularity : 1,
        semiMinorAxis : 2,
        semiMajorAxis : 3,
        numberOfVerticalLines : 4,
        height : 5,
        rotation : 6,
        width : 7
    });
    packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 5, 1, 5, 4, 7, -1];
    createPackableSpecs(EllipseOutlineGeometry, packableInstance, packedInstance, 'at height');
});
