/*global defineSuite*/
defineSuite([
         'Scene/Polygon',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/BoundingRectangle',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage',
         'Scene/SceneMode'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         sceneState,
         pick,
         BoundingRectangle,
         BoundingSphere,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         Matrix4,
         CesiumMath,
         BufferUsage,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var polygon;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        polygon = new Polygon();

        var camera = {
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };

        us = context.getUniformState();
        us.setView(Matrix4.fromCamera(camera));
        us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        polygon = polygon && polygon.destroy();
        us = undefined;
    });

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
        expect(polygon.getPositions()).toEqual(positions);
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
        expect(polygon.material.color).toEqual({
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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders without a material', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.material = undefined;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders without lighting', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
        polygon = createPolygon();
        polygon.affectedByLighting = false;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
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
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
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

    it('test 3D bounding sphere from positions', function() {
        polygon = createPolygon();
        polygon.update(context, sceneState);
        expect(polygon.boundingVolume).toEqual(BoundingSphere.fromPoints(polygon._positions));
    });

    it('test 2D bounding sphere from positions', function() {
        var projection = sceneState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();
        var positions = [
            Cartographic.fromDegrees(-1.0, -1.0, 0.0),
            Cartographic.fromDegrees(1.0, -1.0, 0.0),
            Cartographic.fromDegrees(1.0, 1.0, 0.0),
            Cartographic.fromDegrees(-1.0, 1.0, 0.0)
        ];

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray(positions));

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.COLUMBUS_VIEW;
        polygon.update(context, sceneState);
        sceneState.mode = mode;

        var projectedPositions = [];
        for (var i = 0; i < positions.length; ++i) {
            var position = positions[i];
            projectedPositions.push(projection.project(position));
        }

        var sphere = BoundingSphere.fromPoints(projectedPositions);
        sphere.center = new Cartesian3(0.0, sphere.center.x, sphere.center.y);
        expect(polygon.boundingVolume2D.center.equalsEpsilon(sphere.center, CesiumMath.EPSILON9)).toEqual(true);
        expect(polygon.boundingVolume2D.radius).toEqualEpsilon(sphere.radius, CesiumMath.EPSILON9);
    });

    it('test 2D bounding rectangle from positions', function() {
        var projection = sceneState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();
        var positions = [
            Cartographic.fromDegrees(-1.0, -1.0, 0.0),
            Cartographic.fromDegrees(1.0, -1.0, 0.0),
            Cartographic.fromDegrees(1.0, 1.0, 0.0),
            Cartographic.fromDegrees(-1.0, 1.0, 0.0)
        ];

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray(positions));

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.SCENE2D;
        polygon.update(context, sceneState);
        sceneState.mode = mode;

        var projectedPositions = [];
        for (var i = 0; i < positions.length; ++i) {
            var position = positions[i];
            projectedPositions.push(projection.project(position));
        }

        var rect = BoundingRectangle.fromPoints(projectedPositions);
        expect(polygon.boundingRectangle.x).toEqualEpsilon(rect.x, CesiumMath.EPSILON10);
        expect(polygon.boundingRectangle.y).toEqualEpsilon(rect.y, CesiumMath.EPSILON10);
        expect(polygon.boundingRectangle.width).toEqualEpsilon(rect.width, CesiumMath.EPSILON10);
        expect(polygon.boundingRectangle.height).toEqualEpsilon(rect.height, CesiumMath.EPSILON10);
    });

    it('test 3D bounding sphere from extent', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var extent = new Extent(
                0.0,
                0.0,
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(10.0));

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.configureExtent(extent);

        polygon.update(context, sceneState);
        expect(polygon.boundingVolume).toEqual(BoundingSphere.fromExtent3D(extent, ellipsoid));
    });

    it('test 2D bounding sphere from extent', function() {
        var projection = sceneState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();
        var extent = new Extent(
                0.0,
                0.0,
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(10.0));

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.configureExtent(extent);

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.COLUMBUS_VIEW;
        polygon.update(context, sceneState);
        sceneState.mode = mode;

        var sphere = BoundingSphere.fromExtent2D(extent, projection);
        sphere.center = new Cartesian3(0.0, sphere.center.x, sphere.center.y);
        expect(polygon.boundingVolume2D).toEqual(sphere);
    });

    it('test 2D bounding rectangle from extent', function() {
        var projection = sceneState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();
        var extent = new Extent(
                0.0,
                0.0,
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(10.0));

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.configureExtent(extent);

        var mode = sceneState.mode;
        sceneState.mode = SceneMode.COLUMBUS_VIEW;
        polygon.update(context, sceneState);
        sceneState.mode = mode;

        var rect = BoundingRectangle.fromExtent(extent, projection);
        expect(polygon.boundingRectangle).toEqual(rect);
    });
});