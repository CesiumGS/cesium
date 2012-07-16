/*global defineSuite*/
defineSuite([
         'Scene/Polygon',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         sceneState,
         pick,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         Matrix4,
         CesiumMath,
         BufferUsage) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;
    var polygon;
    var us;

    function createPolygon() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var p = new Polygon();
        p.ellipsoid = ellipsoid;
        p.granularity = CesiumMath.toRadians(20.0);
        p.setPositions([
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
        ]);

        return p;
    }

    beforeEach(function() {
        context = createContext();
        polygon = new Polygon();

        var camera = {
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };
        us = context.getUniformState();
        us.setView(Matrix4.createLookAt(camera.eye, camera.target, camera.up));
        us.setProjection(Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        polygon = polygon && polygon.destroy();
        us = null;

        destroyContext(context);
    });

    it('gets default show', function() {
        expect(polygon.show).toEqual(true);
    });

    it('sets positions', function() {
        var positions = [
                         new Cartesian3(1.0, 2.0, 3.0),
                         new Cartesian3(4.0, 5.0, 6.0),
                         new Cartesian3(7.0, 8.0, 9.0)
                        ];

        expect(polygon.getPositions()).not.toBeDefined();

        polygon.setPositions(positions);
        expect(polygon.getPositions()).toEqualArray(positions);
    });

    it('configures extent', function() {
        var extent = new Extent(
            0.0,
            0.0,
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(10.0)
        );

        polygon.configureExtent(extent);
        expect(polygon.getPositions()).not.toBeDefined();

    });

    it('gets the default color', function() {
        expect(polygon.material.color).toEqualProperties({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
    });

    it('gets default buffer usage', function() {
        expect(polygon.bufferUsage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('has a default ellipsoid', function() {
        expect(polygon.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('gets the default granularity', function() {
        expect(polygon.granularity).toEqual(CesiumMath.toRadians(1.0));
    });

    it('renders', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.material.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders without a material', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.material = undefined;

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders without lighting', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.affectedByLighting = false;

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders extent', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.configureExtent(new Extent(
            0.0,
            0.0,
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(10.0)
        ));
        polygon.material.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('does not renders', function() {
        polygon = createPolygon();
        polygon.material.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        polygon.show = false;

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('is picked', function() {
        polygon = createPolygon();

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).toEqual(polygon);
    });

    it('is not picked', function() {
        polygon = createPolygon();
        polygon.show = false;

        polygon.update(context, sceneState);

        var pickedObject = pick(context, polygon, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });
});
