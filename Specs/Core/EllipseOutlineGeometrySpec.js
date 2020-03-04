import { arrayFill } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { EllipseOutlineGeometry } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { GeometryOffsetAttribute } from '../../Source/Cesium.js';
import createPackableSpecs from '../createPackableSpecs.js';

describe('Core/EllipseOutlineGeometry', function() {

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

    it('computes positions', function() {
        var m = EllipseOutlineGeometry.createGeometry(new EllipseOutlineGeometry({
            ellipsoid : Ellipsoid.WGS84,
            center : Cartesian3.fromDegrees(0,0),
            granularity : 0.1,
            semiMajorAxis : 1.0,
            semiMinorAxis : 1.0
        }));

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
        expect(m.boundingSphere.radius).toEqual(1);
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

        expect(m.attributes.position.values.length).toEqual(16 * 3); // 8 top  + 8 bottom
        expect(m.indices.length).toEqual(24 * 2); // 8 top + 8 bottom + 8 sides
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

        var numVertices = 8;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);

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

        var numVertices = 16;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 8);
        expect(offset).toEqual(expected);
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

        var numVertices = 16;
        expect(m.attributes.position.values.length).toEqual(numVertices * 3);

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

        expect(m.attributes.position.values.length).toEqual(16 * 3);
        expect(m.indices.length).toEqual(16 * 2);
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
        extrudedHeight : 7
    });
    var packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 7, 1, 5, 4, -1];
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
        rotation : 6
    });
    packedInstance = [center.x, center.y, center.z, ellipsoid.radii.x, ellipsoid.radii.y, ellipsoid.radii.z, 3, 2, 6, 5, 1, 5, 4, -1];
    createPackableSpecs(EllipseOutlineGeometry, packableInstance, packedInstance, 'at height');
});
