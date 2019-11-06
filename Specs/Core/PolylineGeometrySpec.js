import { ArcType } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { PolylineGeometry } from '../../Source/Cesium.js';
import { VertexFormat } from '../../Source/Cesium.js';
import createPackableSpecs from '../createPackableSpecs.js';

describe('Core/PolylineGeometry', function() {

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

    it('constructor throws with invalid number of colors', function() {
        expect(function() {
            return new PolylineGeometry({
                positions : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
                colors : []
            });
        }).toThrowDeveloperError();
    });

    it('constructor returns undefined when line width is negative', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : -1.0,
            vertexFormat : VertexFormat.ALL,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line).toBeUndefined();
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

    it('constructor computes all vertex attributes for rhumb lines', function() {
        var positions = Cartesian3.fromDegreesArray([
            30, 30,
            30, 60,
            60, 60
        ]);
        var line = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.ALL,
            granularity : Math.PI,
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            arcType : ArcType.RHUMB
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

    it('createGeometry returns undefined without at least 2 unique positions', function() {
        var position = new Cartesian3(100000.0, -200000.0, 300000.0);
        var positions = [position, Cartesian3.clone(position)];

        var geometry = PolylineGeometry.createGeometry(new PolylineGeometry({
            positions : positions,
            width : 10.0,
            vertexFormat : VertexFormat.POSITION_ONLY,
            arcType : ArcType.NONE
        }));
        expect(geometry).not.toBeDefined();
    });

    var positions = [new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6), new Cartesian3(7, 8, 9)];
    var line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colors : [Color.RED, Color.LIME, Color.BLUE],
        colorsPerVertex : true,
        arcType : ArcType.NONE,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    var packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 1, 0, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance, 'per vertex colors');

    line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colorsPerVertex : false,
        arcType : ArcType.NONE,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 0, 0, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance, 'straight line');

    line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colorsPerVertex : false,
        arcType : ArcType.GEODESIC,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 0, 1, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance, 'geodesic line');

    line = new PolylineGeometry({
        positions : positions,
        width : 10.0,
        colorsPerVertex : false,
        arcType : ArcType.RHUMB,
        granularity : 11,
        vertexFormat : VertexFormat.POSITION_ONLY,
        ellipsoid : new Ellipsoid(12, 13, 14)
    });
    packedInstance = [3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 12, 13, 14, 1, 0, 0, 0, 0, 0, 10, 0, 2, 11];
    createPackableSpecs(PolylineGeometry, line, packedInstance, 'rhumb line');
});
