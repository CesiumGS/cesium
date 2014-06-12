/*global defineSuite*/
defineSuite([
        'Core/CylinderGeometry',
        'Core/VertexFormat'
    ], function(
        CylinderGeometry,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with no length', function() {
        expect(function() {
            return new CylinderGeometry({});
        }).toThrowDeveloperError();
    });

    it('constructor throws with length less than 0', function() {
        expect(function() {
            return new CylinderGeometry({
                length: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no topRadius', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with topRadius less than 0', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1,
                topRadius: -1
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

    it('constructor throws with bottomRadius less than 0', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if top and bottom radius are 0', function() {
        expect(function() {
            return new CylinderGeometry({
                length: 1,
                topRadius: 0,
                bottomRadius: 0
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
});