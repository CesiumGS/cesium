/*global defineSuite*/
defineSuite([
        'Scene/MaterialAppearance',
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
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        MaterialAppearance,
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
                    vertexFormat : MaterialAppearance.MaterialSupport.ALL.vertexFormat,
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
        var a = new MaterialAppearance();

        expect(a.materialSupport).toEqual(MaterialAppearance.MaterialSupport.TEXTURED);
        expect(a.material).toBeDefined();
        expect(a.material.type).toEqual(Material.ColorType);
        expect(a.vertexShaderSource).toEqual(MaterialAppearance.MaterialSupport.TEXTURED.vertexShaderSource);
        expect(a.fragmentShaderSource).toEqual(MaterialAppearance.MaterialSupport.TEXTURED.fragmentShaderSource);
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(true, false));
        expect(a.vertexFormat).toEqual(MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat);
        expect(a.flat).toEqual(false);
        expect(a.faceForward).toEqual(true);
        expect(a.translucent).toEqual(true);
        expect(a.closed).toEqual(false);
    });

    it('renders basic', function() {
        primitive.appearance = new MaterialAppearance({
            materialSupport : MaterialAppearance.MaterialSupport.BASIC,
            translucent : false,
            closed : true,
            material : Material.fromType(Material.DotType)
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders textured', function() {
        primitive.appearance = new MaterialAppearance({
            materialSupport : MaterialAppearance.MaterialSupport.TEXTURED,
            translucent : false,
            closed : true,
            material : Material.fromType(Material.ImageType)
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders all', function() {
        primitive.appearance = new MaterialAppearance({
            materialSupport : MaterialAppearance.MaterialSupport.ALL,
            translucent : false,
            closed : true,
            material : Material.fromType(Material.NormalMapType)
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

}, 'WebGL');