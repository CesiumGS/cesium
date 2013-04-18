/*global defineSuite*/
defineSuite([
         'Scene/Polygon',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/BoundingRectangle',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Matrix4',
         'Core/Math',
         'Core/JulianDate',
         'Renderer/BufferUsage',
         'Scene/SceneMode'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         BoundingRectangle,
         BoundingSphere,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Extent,
         Matrix4,
         CesiumMath,
         JulianDate,
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

        us = context.getUniformState();
        us.update(createFrameState(createCamera(context, new Cartesian3(1.02, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z)));
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

    it('setPositions throws with less than three positions', function() {
        expect(function() {
            polygon.setPositions([new Cartesian3()]);
        }).toThrow();
    });

    it('configure polygon from hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-124.0, 40.0, 0.0)
                ]),
                holes : [{
                        positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                            new Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-122.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 36.0, 0.0)
                        ]),
                        holes : [{
                            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                new Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                                new Cartographic.fromDegrees(-114.0, 36.5, 0.0),
                                new Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                                new Cartographic.fromDegrees(-120.0, 38.5, 0.0)
                            ])
                        }]
                }]
        };

        polygon.configureFromPolygonHierarchy(hierarchy);
        expect(polygon.getPositions()).not.toBeDefined();
    });

    it('configure polygon from clockwise hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                    new Cartographic.fromDegrees(-124.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                    new Cartographic.fromDegrees(-110.0, 35.0, 0.0)
                ]),
                holes : [{
                        positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                            new Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 36.0, 0.0),
                            new Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                            new Cartographic.fromDegrees(-122.0, 39.0, 0.0)
                        ]),
                        holes : [{
                            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                                new Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                                new Cartographic.fromDegrees(-120.0, 38.5, 0.0),
                                new Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                                new Cartographic.fromDegrees(-114.0, 36.5, 0.0)
                            ])
                        }]
                }]
        };

        polygon.configureFromPolygonHierarchy(hierarchy);
        expect(polygon.getPositions()).not.toBeDefined();
    });

    it('configureFromPolygonHierarchy throws with less than three positions', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    new Cartographic()
                ])
        };
        expect(function() {
            polygon.configureFromPolygonHierarchy(hierarchy);
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
        expect(polygon.material.uniforms.color).toEqual({
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
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polygon);
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
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polygon);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        polygon = createPolygon();
        polygon.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        polygon.show = false;

        expect(render(context, frameState, polygon)).toEqual(0);
    });

    it('does not render without positions', function() {
        polygon = new Polygon();
        polygon.ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon.granularity = CesiumMath.toRadians(20.0);
        expect(render(context, frameState, polygon)).toEqual(0);
    });

    it('does not render without positions due to duplicates', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.setPositions([
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
            ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0))
        ]);

        expect(render(context, frameState, polygon)).toEqual(0);
    });

    it('does not render without hierarchy positions due to duplicates', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var hierarchy = {
                positions : ellipsoid.cartographicArrayToCartesianArray([
                    new Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    new Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    new Cartographic.fromDegrees(1.0, 1.0, 0.0)
                ]),
                holes : [{
                        positions : ellipsoid.cartographicArrayToCartesianArray([
                            new Cartographic.fromDegrees(0.0, 0.0, 0.0),
                            new Cartographic.fromDegrees(0.0, 0.0, 0.0),
                            new Cartographic.fromDegrees(0.0, 0.0, 0.0)
                        ])
                }]
        };

        polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.configureFromPolygonHierarchy(hierarchy);

        expect(render(context, frameState, polygon)).toEqual(0);
    });

    it('does not render with empty extent', function() {
        var extent = new Extent(
            0.0,
            0.0,
            0.0,
            0.0
        );

        polygon = new Polygon();
        polygon.ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon.configureExtent(extent);

        expect(render(context, frameState, polygon)).toEqual(0);
    });

    it('is picked', function() {
        polygon = createPolygon();

        var pickedObject = pick(context, frameState, polygon, 0, 0);
        expect(pickedObject).toEqual(polygon);
    });

    it('is not picked (show === false)', function() {
        polygon = createPolygon();
        polygon.show = false;

        var pickedObject = pick(context, frameState, polygon, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        polygon = createPolygon();
        polygon.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, polygon, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('test 3D bounding sphere from positions', function() {
        polygon = createPolygon();
        var commandList = [];
        polygon.update(context, frameState, commandList);
        var boundingVolume = commandList[0].colorList[0].boundingVolume;
        expect(boundingVolume).toEqual(BoundingSphere.fromPoints(polygon._positions));
    });

    function test2DBoundingSphereFromPositions(testMode) {
        var projection = frameState.scene2D.projection;
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

        var mode = frameState.mode;
        frameState.mode = testMode;
        var commandList = [];
        polygon.update(context, frameState, commandList);
        var boundingVolume = commandList[0].colorList[0].boundingVolume;
        frameState.mode = mode;

        var projectedPositions = [];
        for (var i = 0; i < positions.length; ++i) {
            projectedPositions.push(projection.project(positions[i]));
        }

        var sphere = BoundingSphere.fromPoints(projectedPositions);
        sphere.center = new Cartesian3(0.0, sphere.center.x, sphere.center.y);
        expect(boundingVolume.center).toEqualEpsilon(sphere.center, CesiumMath.EPSILON9);
        expect(boundingVolume.radius).toEqualEpsilon(sphere.radius, CesiumMath.EPSILON9);
    }

    it('test 2D bounding sphere from positions', function() {
        test2DBoundingSphereFromPositions(SceneMode.COLUMBUS_VIEW);
    });

    it('test 2D bounding sphere from positions', function() {
        test2DBoundingSphereFromPositions(SceneMode.SCENE2D);
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

        var commandList = [];
        polygon.update(context, frameState, commandList);
        var boundingVolume = commandList[0].colorList[0].boundingVolume;
        expect(boundingVolume).toEqual(BoundingSphere.fromExtent3D(extent, ellipsoid));
    });

    function test2DBoundingSphereFromExtent(testMode) {
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();
        var extent = new Extent(
                0.0,
                0.0,
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(10.0));

        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.configureExtent(extent);

        var mode = frameState.mode;
        frameState.mode = testMode;
        var commandList = [];
        polygon.update(context, frameState, commandList);
        var boundingVolume = commandList[0].colorList[0].boundingVolume;
        frameState.mode = mode;

        var sphere = BoundingSphere.fromExtent2D(extent, projection);
        sphere.center = new Cartesian3(0.0, sphere.center.x, sphere.center.y);
        expect(boundingVolume).toEqualEpsilon(sphere, CesiumMath.EPSILON9);
    }

    it('test 2D bounding sphere from extent', function() {
        test2DBoundingSphereFromExtent(SceneMode.COLUMBUS_VIEW);
    });

    it('test 2D bounding sphere from extent', function() {
        test2DBoundingSphereFromExtent(SceneMode.SCENE2D);
    });

    it('isDestroyed', function() {
        var p = new Polygon();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('throws when updated/rendered without a ellipsoid', function() {
        polygon = createPolygon();
        polygon.ellipsoid = undefined;

        expect(function() {
            polygon.update(context, frameState);
        }).toThrow();
    });

    it('throws when updated/rendered without an invalid granularity', function() {
        polygon = createPolygon();
        polygon.granularity = -1.0;

        expect(function() {
            polygon.update(context, frameState);
        }).toThrow();
    });

    it('throws when rendered without a material', function() {
        polygon = createPolygon();
        polygon.material = undefined;

        expect(function() {
            render(context, frameState, polygon);
        }).toThrow();
    });
}, 'WebGL');
