/*global defineSuite*/
defineSuite([
         'Core/ExtentOutlineGeometry',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/GeographicProjection',
         'Core/Math',
         'Core/Matrix2'
     ], function(
         ExtentOutlineGeometry,
         Cartesian3,
         Ellipsoid,
         Extent,
         GeographicProjection,
         CesiumMath,
         Matrix2) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('computes positions', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
            extent : extent,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
    });

    it('compute positions with rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
            extent : extent,
            rotation : angle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);

        var unrotatedNWCorner = extent.getNorthwest();
        var projection = new GeographicProjection();
        var projectedNWCorner = projection.project(unrotatedNWCorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedNWCornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedNWCorner));
        var rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedNWCornerCartographic);
        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
    });

    it('throws without extent', function() {
        expect(function() {
            return new ExtentOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws if rotated extent is invalid', function() {
        expect(function() {
            return ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
                extent : new Extent(-CesiumMath.PI_OVER_TWO, 1, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO),
                rotation : CesiumMath.PI_OVER_TWO
            }));
        }).toThrowDeveloperError();
    });

    it('throws if east is less than west', function() {
        expect(function() {
            return new ExtentOutlineGeometry({
                extent : new Extent(CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('throws if north is less than south', function() {
        expect(function() {
            return new ExtentOutlineGeometry({
                extent : new Extent(-CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('computes positions extruded', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3 * 2);
        expect(m.indices.length).toEqual(8 * 2 * 2 + 4 * 2);
    });

    it('compute positions with rotation extruded', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
            extent : extent,
            rotation : angle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(8 * 3 * 2);
        expect(m.indices.length).toEqual(8 * 2 * 2 + 4 * 2);

        var unrotatedNWCorner = extent.getNorthwest();
        var projection = new GeographicProjection();
        var projectedNWCorner = projection.project(unrotatedNWCorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedNWCornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedNWCorner));
        rotatedNWCornerCartographic.height = 2;
        var rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedNWCornerCartographic);
        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
    });


    it('computes non-extruded extent if height is small', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentOutlineGeometry.createGeometry(new ExtentOutlineGeometry({
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 0.1
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
    });

});
