/*global defineSuite*/
defineSuite([
        'Core/RectangleGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Matrix2',
        'Core/Rectangle',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        RectangleGeometry,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        GeographicProjection,
        CesiumMath,
        Matrix2,
        Rectangle,
        VertexFormat,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('computes positions', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            rectangle : rectangle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(positions.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle));
        var expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle));
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
        expect(new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1])).toEqualEpsilon(expectedSECorner, CesiumMath.EPSILON9);
    });

    it('computes positions across IDL', function() {
        var rectangle = Rectangle.fromDegrees(179.0, -1.0, -179.0, 1.0);
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            rectangle : rectangle
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(positions.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle));
        var expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle));
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON8);
        expect(new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1])).toEqualEpsilon(expectedSECorner, CesiumMath.EPSILON8);
    });

    it('computes all attributes', function() {
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.ALL,
            rectangle : new Rectangle(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0
        }));
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(m.attributes.st.values.length).toEqual(9 * 2);
        expect(m.attributes.normal.values.length).toEqual(9 * 3);
        expect(m.attributes.tangent.values.length).toEqual(9 * 3);
        expect(m.attributes.binormal.values.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('compute positions with rotation', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            rectangle : rectangle,
            rotation : angle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var unrotatedSECorner = Rectangle.southeast(rectangle);
        var projection = new GeographicProjection();
        var projectedSECorner = projection.project(unrotatedSECorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedSECornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedSECorner, new Cartesian2()));
        var rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedSECornerCartographic);
        var actual = new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1]);
        expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
    });

    it('compute vertices with PI rotation', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            rectangle : rectangle,
            rotation : CesiumMath.PI,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.northwest(rectangle));
        var unrotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(Rectangle.southeast(rectangle));

        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(unrotatedSECorner, CesiumMath.EPSILON8);

        actual = new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1]);
        expect(actual).toEqualEpsilon(unrotatedNWCorner, CesiumMath.EPSILON8);
    });

    it('compute texture coordinates with rotation', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            rectangle : rectangle,
            stRotation : angle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var st = m.attributes.st.values;
        var length = st.length;

        expect(positions.length).toEqual(9 * 3);
        expect(length).toEqual(9 * 2);
        expect(m.indices.length).toEqual(8 * 3);

        expect(st[length - 2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(st[length - 1]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
    });

    it('throws without rectangle', function() {
        expect(function() {
            return new RectangleGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws if rotated rectangle is invalid', function() {
        expect(function() {
            return RectangleGeometry.createGeometry(new RectangleGeometry({
                rectangle : new Rectangle(-CesiumMath.PI_OVER_TWO, 1, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO),
                rotation : CesiumMath.PI_OVER_TWO
            }));
        }).toThrowDeveloperError();
    });

    it('throws if north is less than south', function() {
        expect(function() {
            return new RectangleGeometry({
                rectangle : new Rectangle(-CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('computes positions extruded', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.indices.length).toEqual((8 * 2 + 4 * 4) * 3);
    });

    it('computes all attributes extruded', function() {
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.ALL,
            rectangle : new Rectangle(-2.0, -1.0, 0.0, 1.0),
            granularity : 1.0,
            extrudedHeight : 2
        }));
        expect(m.attributes.position.values.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.attributes.st.values.length).toEqual((9 + 8 + 4) * 2 * 2);
        expect(m.attributes.normal.values.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.attributes.tangent.values.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.attributes.binormal.values.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.indices.length).toEqual((8 * 2 + 4 * 4) * 3);
    });

    it('compute positions with rotation extruded', function() {
        var rectangle = new Rectangle(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            rectangle : rectangle,
            rotation : angle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.indices.length).toEqual((8 * 2 + 4 * 4) * 3);

        var unrotatedSECorner = Rectangle.southeast(rectangle);
        var projection = new GeographicProjection();
        var projectedSECorner = projection.project(unrotatedSECorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedSECornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedSECorner, new Cartesian2()));
        var rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedSECornerCartographic);
        var actual = new Cartesian3(positions[51], positions[52], positions[53]);
        expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
    });

    it('computes non-extruded rectangle if height is small', function() {
        var rectangle = new Rectangle(-2.0, -1.0, 0.0, 1.0);
        var m = RectangleGeometry.createGeometry(new RectangleGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            rectangle : rectangle,
            granularity : 1.0,
            extrudedHeight : 0.1
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);
    });

    var rectangle = new RectangleGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        rectangle : new Rectangle(-2.0, -1.0, 0.0, 1.0),
        granularity : 1.0,
        ellipsoid : Ellipsoid.UNIT_SPHERE
    });
    var packedInstance = [-2.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0];
    createPackableSpecs(RectangleGeometry, rectangle, packedInstance);
});
