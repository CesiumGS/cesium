/*global defineSuite*/
defineSuite([
         'Core/ExtentGeometry',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/GeographicProjection',
         'Core/Math',
         'Core/Matrix2',
         'Core/VertexFormat'
     ], function(
         ExtentGeometry,
         Cartesian3,
         Ellipsoid,
         Extent,
         GeographicProjection,
         CesiumMath,
         Matrix2,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('computes positions', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(positions.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var expectedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        var expectedSECorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast());
        expect(new Cartesian3(positions[0], positions[1], positions[2])).toEqualEpsilon(expectedNWCorner, CesiumMath.EPSILON9);
        expect(new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1])).toEqualEpsilon(expectedSECorner, CesiumMath.EPSILON9);
    });

    it('computes all attributes', function() {
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.ALL,
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
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
        var extent = new Extent(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            extent : extent,
            rotation : angle,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var unrotatedSECorner = extent.getSoutheast();
        var projection = new GeographicProjection();
        var projectedSECorner = projection.project(unrotatedSECorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedSECornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedSECorner));
        var rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedSECornerCartographic);
        var actual = new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1]);
        expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
    });

    it('compute vertices with PI rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            extent : extent,
            rotation : CesiumMath.PI,
            granularity : 1.0
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);

        var unrotatedNWCorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getNorthwest());
        var unrotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(extent.getSoutheast());

        var actual = new Cartesian3(positions[0], positions[1], positions[2]);
        expect(actual).toEqualEpsilon(unrotatedSECorner, CesiumMath.EPSILON8);

        actual = new Cartesian3(positions[length - 3], positions[length - 2], positions[length - 1]);
        expect(actual).toEqualEpsilon(unrotatedNWCorner, CesiumMath.EPSILON8);
    });

    it('compute texture coordinates with rotation', function() {
        var extent = new Extent(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            extent : extent,
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

    it('throws without extent', function() {
        expect(function() {
            return new ExtentGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws if rotated extent is invalid', function() {
        expect(function() {
            return ExtentGeometry.createGeometry(new ExtentGeometry({
                extent : new Extent(-CesiumMath.PI_OVER_TWO, 1, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO),
                rotation : CesiumMath.PI_OVER_TWO
            }));
        }).toThrowDeveloperError();
    });

    it('throws if east is less than west', function() {
        expect(function() {
            return new ExtentGeometry({
                extent : new Extent(CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('throws if north is less than south', function() {
        expect(function() {
            return new ExtentGeometry({
                extent : new Extent(-CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO, -CesiumMath.PI_OVER_TWO)
            });
        }).toThrowDeveloperError();
    });

    it('computes positions extruded', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.indices.length).toEqual((8 * 2 + 4 * 4) * 3);
    });

    it('computes all attributes extruded', function() {
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.ALL,
            extent : new Extent(-2.0, -1.0, 0.0, 1.0),
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
        var extent = new Extent(-1, -1, 1, 1);
        var angle = CesiumMath.PI_OVER_TWO;
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            extent : extent,
            rotation : angle,
            granularity : 1.0,
            extrudedHeight : 2
        }));
        var positions = m.attributes.position.values;
        var length = positions.length;

        expect(length).toEqual((9 + 8 + 4) * 3 * 2);
        expect(m.indices.length).toEqual((8 * 2 + 4 * 4) * 3);

        var unrotatedSECorner = extent.getSoutheast();
        var projection = new GeographicProjection();
        var projectedSECorner = projection.project(unrotatedSECorner);
        var rotation = Matrix2.fromRotation(angle);
        var rotatedSECornerCartographic = projection.unproject(Matrix2.multiplyByVector(rotation, projectedSECorner));
        var rotatedSECorner = Ellipsoid.WGS84.cartographicToCartesian(rotatedSECornerCartographic);
        var actual = new Cartesian3(positions[length - 21], positions[length - 20], positions[length - 19]);
        expect(actual).toEqualEpsilon(rotatedSECorner, CesiumMath.EPSILON6);
    });

    it('computes extruded top open', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 2,
            closeTop : false
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual((((8 + 4) * 2) + 9) * 3);
        expect(m.indices.length).toEqual((8 + 4 * 4) * 3);
    });

    it('computes extruded bottom open', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 2,
            closeBottom : false
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual((((8 + 4) * 2) + 9) * 3);
        expect(m.indices.length).toEqual((8 + 4 * 4) * 3);
    });

    it('computes extruded top and bottom open', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 2,
            closeTop : false,
            closeBottom : false
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual((8 + 4) * 2 * 3);
        expect(m.indices.length).toEqual(4 * 3 * 4);
    });

    it('computes non-extruded extent if height is small', function() {
        var extent = new Extent(-2.0, -1.0, 0.0, 1.0);
        var m = ExtentGeometry.createGeometry(new ExtentGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            extent : extent,
            granularity : 1.0,
            extrudedHeight : 0.1
        }));
        var positions = m.attributes.position.values;

        expect(positions.length).toEqual(9 * 3);
        expect(m.indices.length).toEqual(8 * 3);
    });

});
