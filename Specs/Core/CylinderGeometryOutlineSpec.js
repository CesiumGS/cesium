/*global defineSuite*/
defineSuite([
         'Core/CylinderGeometryOutline',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/VertexFormat'
     ], function(
         CylinderGeometryOutline,
         Cartesian3,
         Ellipsoid,
         CesiumMath,
         VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with no length', function() {
        expect(function() {
            return new CylinderGeometryOutline({});
        }).toThrow();
    });

    it('constructor throws with length less than 0', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: -1
            });
        }).toThrow();
    });

    it('constructor throws with no topRadius', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1
            });
        }).toThrow();
    });

    it('constructor throws with topRadius less than 0', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: -1
            });
        }).toThrow();
    });

    it('constructor throws with no bottomRadius', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: 1
            });
        }).toThrow();
    });

    it('constructor throws with bottomRadius less than 0', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: 1,
                bottomRadius: -1
            });
        }).toThrow();
    });

    it('constructor throws if top and bottom radius are 0', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: 0,
                bottomRadius: 0
            });
        }).toThrow();
    });

    it('constructor throws if slices is less than 3', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                slices: 2
            });
        }).toThrow();
    });

    it('constructor throws if numLengthLines is less than 0', function() {
        expect(function() {
            return new CylinderGeometryOutline({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                numLengthLines: -4
            });
        }).toThrow();
    });

    it('computes positions', function() {
        var m = new CylinderGeometryOutline({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3
        });

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 2);
        expect(m.indices.length).toEqual(9 * 2);
    });

    it('computes positions with no lines along the length', function() {
        var m = new CylinderGeometryOutline({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3,
            numLengthLines: 0
        });

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 2);
        expect(m.indices.length).toEqual(6 * 2);
    });
});