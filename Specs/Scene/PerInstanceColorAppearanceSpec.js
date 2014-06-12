/*global defineSuite*/
defineSuite([
        'Scene/PerInstanceColorAppearance',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryInstance',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Renderer/ClearCommand',
        'Scene/Appearance',
        'Scene/Primitive',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        PerInstanceColorAppearance,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        Rectangle,
        RectangleGeometry,
        ClearCommand,
        Appearance,
        Primitive,
        createContext,
        createFrameState,
        destroyContext,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var primitive;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        var rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
        primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                    rectangle : rectangle
                }),
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0)
                }
            }),
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle);
        var us = context.uniformState;
        us.update(context, frameState);
    });

    afterAll(function() {
        primitive = primitive && primitive.destroy();
        destroyContext(context);
    });

    it('constructor', function() {
        var a = new PerInstanceColorAppearance();

        expect(a.material).not.toBeDefined();
        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, false));
        expect(a.vertexFormat).toEqual(PerInstanceColorAppearance.VERTEX_FORMAT);
        expect(a.flat).toEqual(false);
        expect(a.faceForward).toEqual(true);
        expect(a.translucent).toEqual(true);
        expect(a.closed).toEqual(false);
    });

    it('renders', function() {
        primitive.appearance = new PerInstanceColorAppearance();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders flat', function() {
        primitive.appearance = new PerInstanceColorAppearance({
            flat : true,
            translucent : false,
            closed : true
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

}, 'WebGL');