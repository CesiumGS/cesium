/*global defineSuite*/
defineSuite([
        'Core/CylinderGeometry',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        CylinderGeometry,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('constructor throws with no length', function() {
        expect(function() {
            return new CylinderGeometry({});
        }).toThrowDeveloperError();
    });

    it('constructor throws with no topRadius', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no bottomRadius', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1,
                topRadius: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if slices is less than 3', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                slices: 2
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CylinderGeometry.createGeometry(new CylinderGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 4);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('compute all vertex attributes', function() {
        var m = CylinderGeometry.createGeometry(new CylinderGeometry({
            vertexFormat : VertexFormat.ALL,
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 4);
        expect(m.attributes.st.values.length).toEqual(2 * 3 * 4);
        expect(m.attributes.normal.values.length).toEqual(3 * 3 * 4);
        expect(m.attributes.tangent.values.length).toEqual(3 * 3 * 4);
        expect(m.attributes.binormal.values.length).toEqual(3 * 3 * 4);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('computes positions with topRadius equals 0', function() {
        var m = CylinderGeometry.createGeometry(new CylinderGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            length: 1,
            topRadius: 0,
            bottomRadius: 1,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 4);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('computes positions with bottomRadius equals 0', function() {
        var m = CylinderGeometry.createGeometry(new CylinderGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            length: 1,
            topRadius: 1,
            bottomRadius: 0,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 4);
        expect(m.indices.length).toEqual(8 * 3);
    });

    it('undefined is returned if the length is less than or equal to zero or if ' +
       'both radii are less than or equal to zero', function() {
        var cylinder0 = new CylinderGeometry({
            length: 0,
            topRadius: 80000,
            bottomRadius: 200000
        });
        var cylinder1 = new CylinderGeometry({
            length: 200000,
            topRadius: 0,
            bottomRadius: 0
        });
        var cylinder2 = new CylinderGeometry({
            length: 200000,
            topRadius: -10,
            bottomRadius: -10
        });
        var cylinder3 = new CylinderGeometry({
            length: -200000,
            topRadius: 100,
            bottomRadius: 100
        });

        var geometry0 = CylinderGeometry.createGeometry(cylinder0);
        var geometry1 = CylinderGeometry.createGeometry(cylinder1);
        var geometry2 = CylinderGeometry.createGeometry(cylinder2);
        var geometry3 = CylinderGeometry.createGeometry(cylinder3);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
        expect(geometry3).toBeUndefined();
    });

    var cylinder = new CylinderGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        length: 1,
        topRadius: 1,
        bottomRadius: 0,
        slices: 3
    });
    var packedInstance = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 3.0];
    createPackableSpecs(CylinderGeometry, cylinder, packedInstance);
});
