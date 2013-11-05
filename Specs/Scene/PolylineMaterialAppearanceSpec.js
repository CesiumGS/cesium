/*global defineSuite*/
defineSuite([
         'Scene/PolylineMaterialAppearance',
         'Scene/Appearance',
         'Scene/Material',
         'Scene/Primitive',
         'Core/Cartesian3',
         'Core/Color',
         'Core/GeometryInstance',
         'Core/ColorGeometryInstanceAttribute',
         'Core/PolylineGeometry',
         'Renderer/ClearCommand',
         'Specs/render',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createFrameState',
         'Specs/createCamera'
     ], function(
         PolylineMaterialAppearance,
         Appearance,
         Material,
         Primitive,
         Cartesian3,
         Color,
         GeometryInstance,
         ColorGeometryInstanceAttribute,
         PolylineGeometry,
         ClearCommand,
         render,
         createContext,
         destroyContext,
         createFrameState,
         createCamera) {
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
        frameState = createFrameState(createCamera(context));
        us = context.getUniformState();
        us.update(context, frameState);
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
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        new Cartesian3(0.0, -1.0, 0.0),
                        new Cartesian3(0.0, 1.0, 0.0)
                    ],
                    width : 10.0,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT
                })
            }),
            appearance : new PolylineMaterialAppearance({
                material : Material.fromType(Material.PolylineOutlineType),
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