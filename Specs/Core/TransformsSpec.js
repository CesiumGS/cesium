/*global defineSuite*/
defineSuite([
         'Core/Transforms',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Ellipsoid',
         'Core/Matrix4',
         'Core/Math'
     ], function(
         Transforms,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Ellipsoid,
         Matrix4,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('creates an east-north-up-to-fixed-frame matrix', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.UNIT_X)).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at altitude', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.UNIT_X)).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix 2', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Y.negate())).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.UNIT_X.negate())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at north pole', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.UNIT_X.negate())).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.UNIT_Z)).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix at south pole', function() {
        var m = Transforms.eastNorthUpToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn1().equals(Cartesian4.UNIT_X)).toEqual(true); // north
        expect(m.getColumn2().equals(Cartesian4.UNIT_Z.negate())).toEqual(true); // up
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.UNIT_X.negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at altitude', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(2.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.UNIT_X.negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(2.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix 2', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(-1.0, 0.0, 0.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_Z)).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.UNIT_Y.negate())).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.UNIT_X)).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(-1.0, 0.0, 0.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at north pole', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, 1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_X.negate())).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.UNIT_Z.negate())).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, 1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an north-east-down-to-fixed-frame matrix at south pole', function() {
        var m = Transforms.northEastDownToFixedFrame(new Cartesian3(0.0, 0.0, -1.0), Ellipsoid.UNIT_SPHERE);

        expect(m.getColumn0().equals(Cartesian4.UNIT_X)).toEqual(true); // north
        expect(m.getColumn1().equals(Cartesian4.UNIT_Y)).toEqual(true); // east
        expect(m.getColumn2().equals(Cartesian4.UNIT_Z)).toEqual(true); // down
        expect(m.getColumn3().equals(new Cartesian4(0.0, 0.0, -1.0, 1.0))).toEqual(true); // translation
    });

    it('creates an east-north-up-to-fixed-frame matrix without a position throws', function() {
        expect(function() {
            Transforms.eastNorthUpToFixedFrame();
        }).toThrow();
    });

    it('creates an north-east-down-to-fixed-fram matrix without a position throws', function() {
        expect(function() {
            Transforms.northEastDownToFixedFrame();
        }).toThrow();
    });

    it('transform point to window coordinates without a model-view-projection matrix throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates();
        }).toThrow();
    });

    it('transform point to window coordinates without a viewport transformation throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY);
        }).toThrow();
    });

    it('transform point to window coordinates without a point throws', function() {
        expect(function() {
            Transforms.pointToWindowCoordinates(Matrix4.IDENTITY, Matrix4.IDENTITY);
        }).toThrow();
    });

    it('transform point to window coordinates center', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var view = Matrix4.createLookAt(Cartesian3.UNIT_X.multiplyByScalar(2.0), Cartesian3.ZERO, Cartesian3.UNIT_Z);
        var mvpMatrix = perspective.multiply(view);
        var vpTransform = Matrix4.createViewportTransformation(
            {
                width : width,
                height : height
            });
        var expected = new Cartesian2(width * 0.5, height * 0.5);
        expect(Transforms.pointToWindowCoordinates(mvpMatrix, vpTransform, Cartesian3.ZERO)).toEqual(expected);
    });

    it('transform point to window coordinates lower left', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var vpTransform = Matrix4.createViewportTransformation(
            {
                width : width,
                height : height
            });

        var z = -perspective.getColumn3Row2() / perspective.getColumn2Row2();
        var x = z / perspective.getColumn0Row0();
        var y = z / perspective.getColumn1Row1();
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(0.0, 0.0);
        var actual = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);

        expect(actual.equalsEpsilon(expected, CesiumMath.EPSILON12)).toEqual(true);
    });

    it('transform point to window coordinates upper right', function() {
        var width = 1024.0;
        var height = 768.0;
        var perspective = Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), width / height, 1.0, 10.0);
        var vpTransform = Matrix4.createViewportTransformation(
            {
                width : width,
                height : height
            });

        var z = -perspective.getColumn3Row2() / perspective.getColumn2Row2();
        var x = -z / perspective.getColumn0Row0();
        var y = -z / perspective.getColumn1Row1();
        var point = new Cartesian3(x, y, z);
        var expected = new Cartesian2(width, height);
        var actual = Transforms.pointToWindowCoordinates(perspective, vpTransform, point);

        expect(actual.equalsEpsilon(expected, CesiumMath.EPSILON12)).toEqual(true);
    });

});