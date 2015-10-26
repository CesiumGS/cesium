/*global defineSuite*/
defineSuite([
        'Scene/EllipsoidSurfaceAppearance',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryInstance',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Renderer/ClearCommand',
        'Scene/Appearance',
        'Scene/Material',
        'Scene/Primitive',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/render'
    ], function(
        EllipsoidSurfaceAppearance,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        Rectangle,
        RectangleGeometry,
        ClearCommand,
        Appearance,
        Material,
        Primitive,
        createContext,
        createFrameState,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;
    var rectangle;
    var primitive;

    beforeAll(function() {
        context = createContext();

        rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
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
    });

    beforeEach(function() {
        frameState = createFrameState(context);

        frameState.camera.viewRectangle(rectangle);
        var us = context.uniformState;
        us.update(frameState);
    });

    afterAll(function() {
        primitive = primitive && primitive.destroy();
        context.destroyForSpecs();
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
        primitive.appearance = new EllipsoidSurfaceAppearance();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

}, 'WebGL');