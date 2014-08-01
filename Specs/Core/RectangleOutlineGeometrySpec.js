/*global defineSuite*/
defineSuite([
        'Core/RectangleOutlineGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Matrix2',
        'Core/Rectangle'
    ], function(
        RectangleOutlineGeometry,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        GeographicProjection,
        CesiumMath,
        Matrix2,
        Rectangle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('computes positions', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle));
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
    });

    it('computes positions across IDL', function() {
        var rectangle = Rectangle.fromDegrees(179.0, -1.0, -179.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle));
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
    });

    it('compute positions with rotation', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            rotation : angle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);

        var unrotatedNWCorner = Rectangle.northwest(rectangle);
        var projection = new GeographicProjection();
        var projectedNWCorner = projection.project(unrotatedNWCorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedNWCornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedNWCorner, new Cartesian2()));
        var rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedNWCornerCartographic);
        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
    });

    it('throws without rectangle', function() {
        expect(function() {
            return new RectangleOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws if rotated rectangle is invalid', function() {
        expect(function() {
            return RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
                rectangle : new Rectangle(-CesiumMath.PI_OVER_TWO, 1, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO),
                rotation : CesiumMath.PI_OVER_TWO
            }));
        }).toThrowDeveloperError();
    });

    it('throws if north is less than south', function() {
        expect(function() {
            return new RectangleOutlineGeometry({
                rectangle : new Rectangle(-CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('computes positions extruded', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3 * 2);
        expect(m.indices.length).toEqual(8 * 2 * 2 + 4 * 2);
    });

    it('compute positions with rotation extruded', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            rotation : angle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(8 * 3 * 2);
        expect(m.indices.length).toEqual(8 * 2 * 2 + 4 * 2);

        var unrotatedNWCorner = Rectangle.northwest(rectangle);
        var projection = new GeographicProjection();
        var projectedNWCorner = projection.project(unrotatedNWCorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedNWCornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedNWCorner, new Cartesian2()));
        rotatedNWCornerCartographic.height = 2;
        var rotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedNWCornerCartographic);
        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(rotatedNWCorner, CesiumMath.EPSILON6);
    });


    it('computes non-extruded rectangle if height is small', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 0.1
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
    });

});
