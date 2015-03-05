/*global defineSuite*/
defineSuite([
        'Core/PolylineGeometry',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        PolylineGeometry,
        Cartesian3,
        Color,
        Ellipsoid,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with no positions', function() {
        expect(function() {
            return new PolylineGeometry();
        }).toThrowDeveloperError();
    });

    it('constructor throws with less than two positions', function() {
        expect(function() {
            return new PolylineGeometry({
                positions : [Cartesian3.ZERO]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with invalid width', function() {
        expect(function() {
            return new PolylineGeometry({
                positions : [Cartesian3.ZERO, Cartesian3.UNIT_X],
                width : -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with invalid number of colors', function() {
        expect(function() {
            return new PolylineGeometry({
                positions : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
                colors : []
            });
        }).toThrowDeveloperError();
    });

    it('constructor computes all vertex attributes', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.ALL,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.position).toBeDefined();
        expect(line.attributes.prevPosition).toBeDefined();
        expect(line.attributes.nextPosition).toBeDefined();
        expect(line.attributes.expandAndWidth).toBeDefined();
        expect(line.attributes.st).toBeDefined();

        var numVertices = (positions.length * 4 - 4);
        expect(line.attributes.position.values.length).toEqual(numVertices * 3);
        expect(line.attributes.prevPosition.values.length).toEqual(numVertices * 3);
        expect(line.attributes.nextPosition.values.length).toEqual(numVertices * 3);
        expect(line.attributes.expandAndWidth.values.length).toEqual(numVertices * 2);
        expect(line.attributes.st.values.length).toEqual(numVertices * 2);
        expect(line.indices.length).toEqual(positions.length * 6 - 6);
    });

    it('constructor computes per segment colors', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            colors : colors,
            width : 10.0,
            vertexFormat : VertexFormat.ALL,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = (positions.length * 4 - 4);
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });

    it('constructor computes per vertex colors', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            colors : colors,
            colorsPerVertex : true,
            width : 10.0,
            vertexFormat : VertexFormat.ALL,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = (positions.length * 4 - 4);
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });

    it('removes duplicates within absolute epsilon 7', function() {
        var positions = [
            new Cartesian3(1.0, 0.0, 0.0),
            new Cartesian3(1.0, 0.0, 0.0),
            new Cartesian3(1.0 + CesiumMath.EPSILON7, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, 0.0),
            new Cartesian3(0.0, 0.0, 1.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.POSITION_ONLY,
            followSurface : false
        }));

        var numVertices = ((positions.length - 2) * 4 - 4);
        expect(line.attributes.position.values.length).toEqual(numVertices * 3);
    });

    it('removes duplicates within relative epsilon 7', function() {
        var positions = [
            new Cartesian3(3000000.0, 0.0, 0.0),
            new Cartesian3(3000000.0, 0.0, 0.0),
            new Cartesian3(3000000.2, 0.0, 0.0),
            new Cartesian3(0.0, 3000000.0, 0.0),
            new Cartesian3(0.0, 0.0, 3000000.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.POSITION_ONLY,
            followSurface : false
        }));

        var numVertices = ((positions.length - 2) * 4 - 4);
        expect(line.attributes.position.values.length).toEqual(numVertices * 3);
    });

    it('createGeometry returns undefined without at least 2 unique positions', function() {
        var position = new Cartesian3(100000.0, -200000.0, 300000.0);
        var positions = [position, Cartesian3.clone(position)];

        var geometry = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.POSITION_ONLY,
            followSurface : false
        }));
        expect(geometry).not.toBeDefined();
    });

    var positions = [new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6), new Cartesian3(7, 8, 9)];
    var line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colors : [Color.RED, Color.LIME, Color.BLUE],
        colorsPerVertex : true,
        followSurface : false,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    var packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 1, 0, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance, "per vertex colors");

    line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colorsPerVertex : false,
        followSurface : false,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 0, 0, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance);
});