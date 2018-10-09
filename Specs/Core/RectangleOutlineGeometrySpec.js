defineSuite([
        'Core/RectangleOutlineGeometry',
        'Core/arrayFill',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/GeometryOffsetAttribute',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Matrix2',
        'Core/Rectangle',
        'Specs/createPackableSpecs'
    ], function(
        RectangleOutlineGeometry,
        arrayFill,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        GeometryOffsetAttribute,
        GeographicProjection,
        CesiumMath,
        Matrix2,
        Rectangle,
        createPackableSpecs) {
    'use strict';

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

        expect(positions.length).toEqual(8 * 3);
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

        expect(positions.length).toEqual(16 * 3); // 8 top + 8 bottom
        expect(m.indices.length).toEqual(20 * 2); // 8 top + 8 bottom + 4 edges
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

        expect(positions.length).toEqual(16 * 3);
        expect(m.indices.length).toEqual(20 * 2);

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
            extrudedHeight : CesiumMath.EPSILON14
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(8 * 3);
        expect(m.indices.length).toEqual(8 * 2);
    });

    it('undefined is returned if any side are of length zero', function() {
        var rectangleOutline0 = new RectangleOutlineGeometry({
            rectangle : Rectangle.fromDegrees(-80.0, 39.0, -80.0, 42.0)
        });
        var rectangleOutline1 = new RectangleOutlineGeometry({
            rectangle : Rectangle.fromDegrees(-81.0, 42.0, -80.0, 42.0)
        });
        var rectangleOutline2 = new RectangleOutlineGeometry({
            rectangle : Rectangle.fromDegrees(-80.0, 39.0, -80.0, 39.0)
        });

        var geometry0 = RectangleOutlineGeometry.createGeometry(rectangleOutline0);
        var geometry1 = RectangleOutlineGeometry.createGeometry(rectangleOutline1);
        var geometry2 = RectangleOutlineGeometry.createGeometry(rectangleOutline2);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
    });

    it('computes offset attribute', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0,
            offsetAttribute : GeometryOffsetAttribute.TOP
        }));
        var positions = m.attributes.position.values;

        var numVertices = 8;
        expect(positions.length).toEqual(numVertices * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for top vertices', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 2,
            offsetAttribute : GeometryOffsetAttribute.TOP
        }));
        var positions = m.attributes.position.values;

        var numVertices = 16;
        expect(positions.length).toEqual(numVertices * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 8);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for all vertices', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleOutlineGeometry.createGeometry(new RectangleOutlineGeometry({
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 2,
            offsetAttribute : GeometryOffsetAttribute.ALL
        }));
        var positions = m.attributes.position.values;

        var numVertices = 16;
        expect(positions.length).toEqual(numVertices * 3);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    var rectangle = new RectangleOutlineGeometry({
        rectangle : new Rectangle(0.1, 0.2, 0.3, 0.4),
        ellipsoid : new Ellipsoid(5, 6, 7),
        granularity : 8,
        height : 9,
        rotation : 10,
        extrudedHeight : 11
    });
    var packedInstance = [0.1, 0.2, 0.3, 0.4, 5, 6, 7, 8, 11, 10, 9, -1];
    createPackableSpecs(RectangleOutlineGeometry, rectangle, packedInstance, 'extruded');

    rectangle = new RectangleOutlineGeometry({
        rectangle : new Rectangle(0.1, 0.2, 0.3, 0.4),
        ellipsoid : new Ellipsoid(5, 6, 7),
        granularity : 8,
        height : 9,
        rotation : 10
    });
    packedInstance = [0.1, 0.2, 0.3, 0.4, 5, 6, 7, 8, 9, 10, 9, -1];
    createPackableSpecs(RectangleOutlineGeometry, rectangle, packedInstance, 'at height');

});
