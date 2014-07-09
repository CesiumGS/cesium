/*global defineSuite*/
defineSuite([
        'Scene/PolylineColorAppearance',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryInstance',
        'Core/PolylineGeometry',
        'Renderer/ClearCommand',
        'Scene/Appearance',
        'Scene/Primitive',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        PolylineColorAppearance,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        GeometryInstance,
        PolylineGeometry,
        ClearCommand,
        Appearance,
        Primitive,
        createCamera,
        createContext,
        createFrameState,
        destroyContext,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var us;
    var frameState;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        frameState = createFrameState(createCamera());
        us = context.uniformState;
        us.update(context, frameState);
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
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        new Cartesian3(0.0, -1.0, 0.0),
                        new Cartesian3(0.0, 1.0, 0.0)
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

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

}, 'WebGL');