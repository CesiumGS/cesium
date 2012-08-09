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

    it('get polygons from hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(-122.0, 37.0, 0.0),
                    new Cartographic.fromDegrees(-121.5, 37.0, 0.0),
                    new Cartographic.fromDegrees(-121.5, 37.1, 0.0),
                    new Cartographic.fromDegrees(-122.0, 37.1, 0.0),
                    new Cartographic.fromDegrees(-122.0, 37.0, 0.0)
                ]),
                holes : [
                         {
                             positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                new Cartographic.fromDegrees(-121.98, 37.02, 0.0),
                                new Cartographic.fromDegrees(-121.98, 37.08, 0.0),
                                new Cartographic.fromDegrees(-121.92, 37.08, 0.0),
                                new Cartographic.fromDegrees(-121.92, 37.02, 0.0),
                                new Cartographic.fromDegrees(-121.98, 37.02, 0.0)
                             ]),
                             holes : [
                                      {
                                          positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                            new Cartographic.fromDegrees(-121.96, 37.04, 0.0),
                                            new Cartographic.fromDegrees(-121.94, 37.04, 0.0),
                                            new Cartographic.fromDegrees(-121.94, 37.06, 0.0),
                                            new Cartographic.fromDegrees(-121.96, 37.06, 0.0),
                                            new Cartographic.fromDegrees(-121.96, 37.04, 0.0)
                                          ])
                                      }
                             ]
                         },
                         {
                             positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                new Cartographic.fromDegrees(-121.58, 37.02, 0.0),
                                new Cartographic.fromDegrees(-121.58, 37.08, 0.0),
                                new Cartographic.fromDegrees(-121.52, 37.08, 0.0),
                                new Cartographic.fromDegrees(-121.52, 37.02, 0.0),
                                new Cartographic.fromDegrees(-121.58, 37.02, 0.0)
                             ]),
                             holes : [
                                      {
                                          positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                            new Cartographic.fromDegrees(-121.56, 37.04, 0.0),
                                            new Cartographic.fromDegrees(-121.54, 37.04, 0.0),
                                            new Cartographic.fromDegrees(-121.54, 37.06, 0.0),
                                            new Cartographic.fromDegrees(-121.56, 37.06, 0.0),
                                            new Cartographic.fromDegrees(-121.56, 37.04, 0.0)
                                          ])
                                      }
                             ]
                         }
                ]
        };
        var polygons = Polygon.getPolygonsFromHierarchy(hierarchy);
        expect(polygons.length).toEqual(3);
    });

    it('getPolygonsFromHierarchy throws without a hierarchy', function() {
        expect(function() {
            Polygon.getPolygonsFromHierarchy();
        }).toThrow();
    });

    it('getPolygonsFromHierarchy throws without a positions property', function() {
        expect(function() {
            Polygon.getPolygonsFromHierarchy({holes : []});
        }).toThrow();
    });

    it('getPolygonsFromHierarchy throws without a holes property', function() {
        expect(function() {
            Polygon.getPolygonsFromHierarchy({positions : []});
        }).toThrow();
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
});