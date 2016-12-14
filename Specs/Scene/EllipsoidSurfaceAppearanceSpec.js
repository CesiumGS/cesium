/*global defineSuite*/
defineSuite([
        'Scene/EllipsoidSurfaceAppearance',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryInstance',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Scene/Appearance',
        'Scene/Material',
        'Scene/Primitive',
        'Specs/createScene'
    ], function(
        EllipsoidSurfaceAppearance,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        Rectangle,
        RectangleGeometry,
        Appearance,
        Material,
        Primitive,
        createScene) {
    'use strict';

    var scene;
    var rectangle;
    var primitive;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;
        scene.frameState.scene3DOnly = false;

        rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
    });

    beforeEach(function() {
        scene.camera.setView({ destination : rectangle });
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it('constructor', function() {
        var a = new EllipsoidSurfaceAppearance();

        expect(a.material).toBeDefined();
        expect(a.material.type).toEqual(Material.ColorType);
        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, true));
        expect(a.vertexFormat).toEqual(EllipsoidSurfaceAppearance.VERTEX_FORMAT);
        expect(a.flat).toEqual(false);
        expect(a.faceForward).toEqual(false);
        expect(a.translucent).toEqual(true);
        expect(a.aboveGround).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('renders', function() {
        primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : rectangle,
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            }),
            asynchronous : false
        });
        primitive.appearance = new EllipsoidSurfaceAppearance();

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

}, 'WebGL');
