defineSuite([
         'Core/Transforms',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid'
     ], function(
         Transforms,
         Cartesian3,
         Cartesian4,
         Ellipsoid) {
    "use strict";
    /*global it,expect*/

    it("creates an east-north-up-to-fixed-frame matrix", function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.getUnitX())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an east-north-up-to-fixed-frame matrix at altitude", function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.getUnitX())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an east-north-up-to-fixed-frame matrix 2", function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitY().negate())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.getUnitX().negate())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an east-north-up-to-fixed-frame matrix at north pole", function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.getUnitX().negate())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.getUnitZ())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it("creates an east-north-up-to-fixed-frame matrix at south pole", function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.getUnitX())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.getUnitZ().negate())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it("creates an north-east-down-to-fixed-frame matrix", function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.getUnitX().negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an north-east-down-to-fixed-frame matrix at altitude", function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.getUnitX().negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an north-east-down-to-fixed-frame matrix 2", function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitZ())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.getUnitY().negate())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.getUnitX())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it("creates an north-east-down-to-fixed-frame matrix at north pole", function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitX().negate())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.getUnitZ().negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it("creates an north-east-down-to-fixed-frame matrix at south pole", function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.getUnitSphere());

        expect(m.getColumn0().equals(Cartesian4.getUnitX())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.getUnitY())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.getUnitZ())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it("creates an east-north-up-to-fixed-frame matrix without a position throws", function() {
        expect(function() {
            Transforms.eastNorthUpToFixedFrame();
        }).toThrow();
    });

    it("creates an north-east-down-to-fixed-fram matrix without a position throws", function() {
        expect(function() {
            Transforms.northEastDownToFixedFrame();
        }).toThrow();
    });
});
