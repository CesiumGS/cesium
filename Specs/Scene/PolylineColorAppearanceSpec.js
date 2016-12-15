/*global defineSuite*/
defineSuite([
        'Scene/PolylineColorAppearance',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryInstance',
        'Core/PolylineGeometry',
        'Scene/Appearance',
        'Scene/Primitive',
        'Specs/createScene'
    ], function(
        PolylineColorAppearance,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        PolylineGeometry,
        Appearance,
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
        var a = new PolylineColorAppearance();

        expect(a.material).not.toBeDefined();
        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, false));
        expect(a.vertexFormat).toEqual(PolylineColorAppearance.VERTEX_FORMAT);
        expect(a.translucent).toEqual(true);
        expect(a.closed).toEqual(false);
    });

    it('renders', function() {
        primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        new Cartesian3(0.0, -1000000.0, 0.0),
                        new Cartesian3(0.0, 1000000.0, 0.0)
                    ],
                    width : 10.0,
                    vertexFormat : PolylineColorAppearance.VERTEX_FORMAT,
                    followSurface: false
                }),
                attributes : {
                    color : ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 0.0, 1.0))
                }
            }),
            appearance : new PolylineColorAppearance({
                translucent : false
            }),
            asynchronous : false
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

}, 'WebGL');
