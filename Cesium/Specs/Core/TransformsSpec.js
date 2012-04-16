(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("Transforms", function () {

        it("creates an east-north-up-to-fixed-frame matrix", function() {
            var m = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();              // north
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX())).toBeTruthy();              // up
            expect(m.getColumn3().equals(new Cesium.Cartesian4(1.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an east-north-up-to-fixed-frame matrix at altitude", function() {
            var m = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(2.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();              // north
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX())).toBeTruthy();              // up
            expect(m.getColumn3().equals(new Cesium.Cartesian4(2.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an east-north-up-to-fixed-frame matrix 2", function() {
            var m = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(-1.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitY().negate())).toBeTruthy();      // east
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();               // north
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX().negate())).toBeTruthy();      // up
            expect(m.getColumn3().equals(new Cesium.Cartesian4(-1.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an east-north-up-to-fixed-frame matrix at north pole", function() {
            var m = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(0.0, 0.0, 1.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitX().negate())).toBeTruthy();     // north
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();              // up
            expect(m.getColumn3().equals(new Cesium.Cartesian4(0.0, 0.0, 1.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an east-north-up-to-fixed-frame matrix at south pole", function() {
            var m = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(0.0, 0.0, -1.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();               // east
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitX())).toBeTruthy();               // north
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitZ().negate())).toBeTruthy();      // up
            expect(m.getColumn3().equals(new Cesium.Cartesian4(0.0, 0.0, -1.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an north-east-down-to-fixed-frame matrix", function() {
            var m = Cesium.Transforms.northEastDownToFixedFrame(new Cesium.Cartesian3(1.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();              // north
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX().negate())).toBeTruthy();     // down
            expect(m.getColumn3().equals(new Cesium.Cartesian4(1.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an north-east-down-to-fixed-frame matrix at altitude", function() {
            var m = Cesium.Transforms.northEastDownToFixedFrame(new Cesium.Cartesian3(2.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();              // north
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX().negate())).toBeTruthy();     // down
            expect(m.getColumn3().equals(new Cesium.Cartesian4(2.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an north-east-down-to-fixed-frame matrix 2", function() {
            var m = Cesium.Transforms.northEastDownToFixedFrame(new Cesium.Cartesian3(-1.0, 0.0, 0.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();               // north
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitY().negate())).toBeTruthy();      // east
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitX())).toBeTruthy();               // down
            expect(m.getColumn3().equals(new Cesium.Cartesian4(-1.0, 0.0, 0.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an north-east-down-to-fixed-frame matrix at north pole", function() {
            var m = Cesium.Transforms.northEastDownToFixedFrame(new Cesium.Cartesian3(0.0, 0.0, 1.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitX().negate())).toBeTruthy();     // north
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();              // east
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitZ().negate())).toBeTruthy();     // down
            expect(m.getColumn3().equals(new Cesium.Cartesian4(0.0, 0.0, 1.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an north-east-down-to-fixed-frame matrix at south pole", function() {
            var m = Cesium.Transforms.northEastDownToFixedFrame(new Cesium.Cartesian3(0.0, 0.0, -1.0), Cesium.Ellipsoid.getUnitSphere());

            expect(m.getColumn0().equals(Cesium.Cartesian4.getUnitX())).toBeTruthy();               // north
            expect(m.getColumn1().equals(Cesium.Cartesian4.getUnitY())).toBeTruthy();               // east
            expect(m.getColumn2().equals(Cesium.Cartesian4.getUnitZ())).toBeTruthy();               // down
            expect(m.getColumn3().equals(new Cesium.Cartesian4(0.0, 0.0, -1.0, 1.0))).toBeTruthy(); // translation
        });

        it("creates an east-north-up-to-fixed-frame matrix without a position throws", function() {
            expect(function() {
                Cesium.Transforms.eastNorthUpToFixedFrame();
            }).toThrow();
        });
    });
}());