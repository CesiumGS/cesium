/*global defineSuite*/
defineSuite([
         'Core/PolygonGeometry',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Matrix4',
         'Core/Math',
         'Core/JulianDate',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Scene/Material',
         'Scene/Appearance',
         'Scene/Primitive',
         'Scene/SceneMode'
     ], function(
         PolygonGeometry,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Matrix4,
         CesiumMath,
         JulianDate,
         BufferUsage,
         ClearCommand,
         Material,
         Appearance,
         Primitive,
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
        polygon = createPolygonGeometry();

        us = context.getUniformState();
        us.update(createFrameState(createCamera(context, new Cartesian3(1.02, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z)));
    });

    afterEach(function() {
        polygon = undefined;
        us = undefined;
    });

    function createPolygonGeometry() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var p = new PolygonGeometry({
            positions : [
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
                ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
            ],
            ellipsoid : ellipsoid
        });

        return p;
    }

    it('create throws with less than three positions', function() {
        expect(function() {
            return new PolygonGeometry({ positions : [new Cartesian3()] });
        }).toThrow();
    });

    it('create polygon from hierarchy', function() {
        var hierarchy = {
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                    Cartographic.fromDegrees(-110.0, 35.0, 0.0),
                    Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                    Cartographic.fromDegrees(-124.0, 40.0, 0.0)
                ]),
                holes : [{
                    positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                        Cartographic.fromDegrees(-122.0, 39.0, 0.0),
                        Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                        Cartographic.fromDegrees(-112.0, 36.0, 0.0)
                    ]),
                    holes : [{
                        positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                            Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                            Cartographic.fromDegrees(-114.0, 36.5, 0.0),
                            Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                            Cartographic.fromDegrees(-120.0, 38.5, 0.0)
                        ])
                    }]
                }]
        };

        var p = new PolygonGeometry({ polygonHierarchy : hierarchy });
    });

    it('create polygon from clockwise hierarchy', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                Cartographic.fromDegrees(-124.0, 40.0, 0.0),
                Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                Cartographic.fromDegrees(-110.0, 35.0, 0.0)
            ]),
            holes : [{
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-122.0, 39.0, 0.0)
                ]),
                holes : [{
                    positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-120.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 36.5, 0.0)
                    ])
                }]
            }]
        };

        var p = new PolygonGeometry({ polygonHierarchy : hierarchy });
    });

    it('create from PolygonHierarchy throws with less than three positions', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                new Cartographic()
            ])
        };

        expect(function() {
            return new PolygonGeometry({ polygonHierarchy : hierarchy });
        }).toThrow();
    });

    it('renders', function() {
        // This test fails in Chrome if a breakpoint is set inside this function.  Strange.

        var material = Material.fromType(undefined, Material.ColorType);
        material.uniforms.color = { red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 };
        var appearance = new Appearance({ material : material });

        var primitive = new Primitive({
            geometries : polygon,
            appearance : appearance
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        var material = Material.fromType(undefined, Material.ColorType);
        material.uniforms.color = { red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 };
        var appearance = new Appearance({ material : material });
        var primitive = new Primitive({
            geometries : polygon,
            appearance : appearance
        });
        primitive.show = false;

        expect(render(context, frameState, primitive)).toEqual(0);
    });

    it('cannot create due to duplicate positions', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        expect(function() {
            polygon = new PolygonGeometry({
                positions : [
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0))
                ],
                ellipsoid : ellipsoid
            });
        }).toThrow();
    });

    it('cannot create due to duplicate hierarchy positions', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var hierarchy = {
                positions : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    Cartographic.fromDegrees(1.0, 1.0, 0.0)
                ]),
                holes : [{
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0, 0.0),
                        Cartographic.fromDegrees(0.0, 0.0, 0.0),
                        Cartographic.fromDegrees(0.0, 0.0, 0.0)
                    ])
                }]
        };

        expect(function() {
            polygon = new PolygonGeometry({
                polygonHierarchy : hierarchy,
                ellipsoid : ellipsoid
            });
        }).toThrow();
    });
}, 'WebGL');
