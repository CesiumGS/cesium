/*global defineSuite*/
defineSuite([
        'Core/CylinderOutlineGeometry',
        'Specs/createPackableSpecs'
    ], function(
        CylinderOutlineGeometry,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor throws with no length', function() {
        expect(function() {
            return new CylinderOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('constructor throws with length less than 0', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no topRadius', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with topRadius less than 0', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no bottomRadius', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with bottomRadius less than 0', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: -1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if top and bottom radius are 0', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 0,
                bottomRadius: 0
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if slices is less than 3', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                slices: 2
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CylinderOutlineGeometry.createGeometry(new CylinderOutlineGeometry({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 2);
        expect(m.indices.length).toEqual(9 * 2);
    });

    it('computes positions with no lines along the length', function() {
        var m = CylinderOutlineGeometry.createGeometry(new CylinderOutlineGeometry({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3,
            numberOfVerticalLines: 0
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 3 * 2);
        expect(m.indices.length).toEqual(6 * 2);
    });

    var cylinder = new CylinderOutlineGeometry({
        length: 1,
        topRadius: 1,
        bottomRadius: 0,
        slices: 3,
        numberOfVerticalLines: 0
    });
    var packedInstance = [1.0, 1.0, 0.0, 3.0, 0.0];
    createPackableSpecs(CylinderOutlineGeometry, cylinder, packedInstance);
});