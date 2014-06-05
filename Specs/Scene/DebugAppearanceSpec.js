/*global defineSuite*/
defineSuite([
        'Scene/DebugAppearance',
        'Core/ComponentDatatype',
        'Core/GeometryInstance',
        'Core/GeometryInstanceAttribute',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/VertexFormat',
        'Renderer/ClearCommand',
        'Scene/Appearance',
        'Scene/Primitive',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        DebugAppearance,
        ComponentDatatype,
        GeometryInstance,
        GeometryInstanceAttribute,
        Rectangle,
        RectangleGeometry,
        VertexFormat,
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
    var rectangleInstance;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        var rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
        rectangleInstance = new GeometryInstance({
            geometry : new RectangleGeometry({
                vertexFormat : VertexFormat.ALL,
                rectangle : rectangle
            })
        });

        frameState.camera.viewRectangle(rectangle);
        var us = context.uniformState;
        us.update(context, frameState);
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('constructor throws without attributeName', function() {
        expect(function() {
            return new DebugAppearance();
        }).toThrowDeveloperError();
    });

    it('default construct with normal, binormal, or tangent attribute name', function() {
        var a = new DebugAppearance({
            attributeName : 'normal'
        });

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.vertexShaderSource.indexOf('normal')).toBeGreaterThan(-1);
        expect(a.vertexShaderSource.indexOf('v_normal')).toBeGreaterThan(-1);

        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.fragmentShaderSource.indexOf('v_normal')).toBeGreaterThan(-1);

        expect(a.material).not.toBeDefined();
        expect(a.attributeName).toEqual('normal');
        expect(a.glslDatatype).toEqual('vec3');
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('default construct with st attribute name', function() {
        var a = new DebugAppearance({
            attributeName : 'st'
        });

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.vertexShaderSource.indexOf('st')).toBeGreaterThan(-1);
        expect(a.vertexShaderSource.indexOf('v_st')).toBeGreaterThan(-1);

        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.fragmentShaderSource.indexOf('v_st')).toBeGreaterThan(-1);

        expect(a.material).not.toBeDefined();
        expect(a.attributeName).toEqual('st');
        expect(a.glslDatatype).toEqual('vec2');
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('debug appearance with float attribute name', function() {
        var a = new DebugAppearance({
            attributeName : 'rotation',
            glslDatatype : 'float'
        });

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.vertexShaderSource.indexOf('rotation')).toBeGreaterThan(-1);
        expect(a.vertexShaderSource.indexOf('v_rotation')).toBeGreaterThan(-1);

        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.fragmentShaderSource.indexOf('v_rotation')).toBeGreaterThan(-1);

        expect(a.material).not.toBeDefined();
        expect(a.attributeName).toEqual('rotation');
        expect(a.glslDatatype).toEqual('float');
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('debug appearance with vec3 attribute name', function() {
        var a = new DebugAppearance({
            attributeName : 'str',
            glslDatatype : 'vec3'
        });

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.vertexShaderSource.indexOf('str')).toBeGreaterThan(-1);
        expect(a.vertexShaderSource.indexOf('v_str')).toBeGreaterThan(-1);

        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.fragmentShaderSource.indexOf('v_str')).toBeGreaterThan(-1);

        expect(a.material).not.toBeDefined();
        expect(a.attributeName).toEqual('str');
        expect(a.glslDatatype).toEqual('vec3');
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('debug appearance with vec4 attribute name', function() {
        var a = new DebugAppearance({
            attributeName : 'quaternion',
            glslDatatype : 'vec4'
        });

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.vertexShaderSource.indexOf('quaternion')).toBeGreaterThan(-1);
        expect(a.vertexShaderSource.indexOf('v_quaternion')).toBeGreaterThan(-1);

        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.fragmentShaderSource.indexOf('v_quaternion')).toBeGreaterThan(-1);

        expect(a.material).not.toBeDefined();
        expect(a.attributeName).toEqual('quaternion');
        expect(a.glslDatatype).toEqual('vec4');
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
    });

    it('debug appearance throws with invalid glsl datatype', function() {
        expect(function() {
            return new DebugAppearance({
                attributeName : 'invalid_datatype',
                glslDatatype : 'invalid'
            });
        }).toThrowDeveloperError();
    });

    it('renders normal', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'normal'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders binormal', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'binormal'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders tangent', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'tangent'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders st', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'st'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders float', function() {
        rectangleInstance.attributes = {
            debug : new GeometryInstanceAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 1,
                value : [1.0]
            })
        };
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'debug',
                glslDatatype : 'float'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders vec2', function() {
        rectangleInstance.attributes = {
            debug : new GeometryInstanceAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                value : [1.0, 2.0]
            })
        };
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'debug',
                glslDatatype : 'vec2'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders vec3', function() {
        rectangleInstance.attributes = {
            debug : new GeometryInstanceAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                value : [1.0, 2.0, 3.0]
            })
        };
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'debug',
                glslDatatype : 'vec3'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('renders vec4', function() {
        rectangleInstance.attributes = {
            debug : new GeometryInstanceAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                value : [1.0, 2.0, 3.0, 4.0]
            })
        };
        var primitive = new Primitive({
            geometryInstances : rectangleInstance,
            appearance : new DebugAppearance({
                attributeName : 'debug',
                glslDatatype : 'vec4'
            }),
            asynchronous : false
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

}, 'WebGL');