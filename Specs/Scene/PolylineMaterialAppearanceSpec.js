/*global defineSuite*/
defineSuite([
        'Scene/PolylineMaterialAppearance',
        'Core/Cartesian3',
        'Core/GeometryInstance',
        'Core/PolylineGeometry',
        'Scene/Appearance',
        'Scene/Material',
        'Scene/Primitive',
        'Specs/createScene'
    ], function(
        PolylineMaterialAppearance,
        Cartesian3,
        GeometryInstance,
        PolylineGeometry,
        Appearance,
        Material,
        Primitive,
        createScene) {
    'use strict';

    var scene;
    var primitive;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it('constructor', function() {
        var a = new PolylineMaterialAppearance();

        expect(a.material).toBeDefined();
        expect(a.material.type).toEqual(Material.ColorType);
        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, false));
        expect(a.vertexFormat).toEqual(PolylineMaterialAppearance.VERTEX_FORMAT);
        expect(a.translucent).toEqual(true);
        expect(a.closed).toEqual(false);
    });

    it('renders', function() {
        primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        new Cartesian3(0.0, -10000000, 0.0),
                        new Cartesian3(0.0, 1000000.0, 0.0)
                    ],
                    width : 10.0,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    followSurface: false
                })
            }),
            appearance : new PolylineMaterialAppearance({
                material : Material.fromType(Material.PolylineOutlineType),
                translucent : false
            }),
            asynchronous : false
        });

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

}, 'WebGL');
