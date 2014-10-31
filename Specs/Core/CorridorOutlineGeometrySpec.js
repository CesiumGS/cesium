/*global defineSuite*/
defineSuite([
        'Core/CorridorOutlineGeometry',
        'Core/Cartesian3',
        'Core/CornerType'
    ], function(
        CorridorOutlineGeometry,
        Cartesian3,
        CornerType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without positions', function() {
        expect(function() {
            return new CorridorOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without 2 unique positions', function() {
        expect(function() {
            return CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
                positions : Cartesian3.fromDegreesArray([
                    90.0, -30.0,
                    90.0, -30.0
                ]),
                width: 10000
            }));
        }).toThrowDeveloperError();
    });

    it('throws without width', function() {
        expect(function() {
            return new CorridorOutlineGeometry({
                positions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 12);
        expect(m.indices.length).toEqual(2 * 12);
    });

    it('computes positions extruded', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -35.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000,
            extrudedHeight: 30000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 24);
        expect(m.indices.length).toEqual(2 * 12 * 2 + 8);
    });

    it('computes right turn', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 8);
        expect(m.indices.length).toEqual(2 * 8);
    });

    it('computes left turn', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 8);
        expect(m.indices.length).toEqual(2 * 8);
    });

    it('computes with rounded corners', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0,
                89.0, -32.0
            ]),
            cornerType: CornerType.ROUNDED,
            width : 30000
        }));

        var endCaps = 180/5*2;
        var corners = 90/5*2;
        expect(m.attributes.position.values.length).toEqual(3 * (11 + endCaps + corners));
        expect(m.indices.length).toEqual(2 * (11 + endCaps + corners));
    });

    it('computes with beveled corners', function() {
        var m = CorridorOutlineGeometry.createGeometry(new CorridorOutlineGeometry({
            positions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -31.0,
                 89.0, -31.0,
                 89.0, -32.0
            ]),
            cornerType: CornerType.BEVELED,
            width : 30000
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 10);
        expect(m.indices.length).toEqual(2 * 10);
    });
});