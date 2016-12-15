/*global defineSuite*/
defineSuite([
        'Scene/PointAppearance',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/GeometryInstance',
        'Core/PointGeometry',
        'Core/VertexFormat',
        'Scene/Appearance',
        'Scene/Primitive',
        'Specs/createScene'
    ], function(
        PointAppearance,
        BoundingSphere,
        Cartesian3,
        Color,
        GeometryInstance,
        PointGeometry,
        VertexFormat,
        Appearance,
        Primitive,
        createScene) {
    'use strict';

    var scene;
    var primitive;

    beforeAll(function() {
        scene = createScene();
        scene.frameState.scene3DOnly = true;

        var camera = scene.camera;
        camera.position = new Cartesian3(10.0, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        var positionsTypedArray = new Float64Array([0.0, 0.0, 0.0, -1.0, 0.0, 0.0]);
        var colorsTypedArray = new Uint8Array([255, 0, 0, 0, 255, 0]);
        var boundingSphere = BoundingSphere.fromVertices(positionsTypedArray);

        var instance = new GeometryInstance({
            geometry : new PointGeometry({
                positionsTypedArray : positionsTypedArray,
                colorsTypedArray : colorsTypedArray,
                boundingSphere : boundingSphere
            })
        });

        primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PointAppearance(),
            asynchronous : false,
            allowPicking : false,
            cull : false
        });

        scene.primitives.add(primitive);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('default constructor', function() {
        var a = new PointAppearance();

        expect(a.vertexShaderSource).toBeDefined();
        expect(a.fragmentShaderSource).toBeDefined();
        expect(a.renderState).toEqual(Appearance.getDefaultRenderState(false, false));
        expect(a.material).not.toBeDefined();
        expect(a.translucent).toEqual(false);
        expect(a.closed).toEqual(false);
        expect(a.vertexFormat).toEqual(VertexFormat.POSITION_AND_COLOR);
        expect(a.uniforms.highlightColor).toEqual(new Color());
        expect(a.uniforms.pointSize).toEqual(2.0);
    });

    it('renders', function() {
        primitive.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        primitive.show = true;
        expect(scene).toRender([255, 0, 0, 255]);
        primitive.show = false;
    });

    it('renders with translucency', function() {
        primitive.appearance.translucent = true;
        primitive.appearance.uniforms.highlightColor.alpha = 0.5;

        primitive.show = false;
        expect(scene).toRender([0, 0, 0, 255]);

        primitive.show = true;
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[0]).toBeLessThan(255);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[1]).toBeLessThan(255);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
        });
        primitive.show = false;
    });

    it('renders relative to center', function() {
        // Camera is positioned at (10, 0, 0) and looking down -x axis. Without rtc the first point would be behind the camera.
        var positionsTypedArray = new Float32Array([20.0, 0.0, 0.0, -20.0, 0.0, 0.0]);
        var colorsTypedArray = new Uint8Array([255, 0, 0, 0, 255, 0]);
        var boundingSphere = new BoundingSphere(new Cartesian3(-15.0, 0.0, 0.0), 20.0);

        var instance = new GeometryInstance({
            geometry : new PointGeometry({
                positionsTypedArray : positionsTypedArray,
                colorsTypedArray : colorsTypedArray,
                boundingSphere : boundingSphere
            })
        });

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : new PointAppearance(),
            asynchronous : false,
            allowPicking : false,
            cull : false,
            rtcCenter : boundingSphere.center
        });

        scene.primitives.add(primitive);

        primitive.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        primitive.show = true;
        expect(scene).toRender([255, 0, 0, 255]);

        scene.primitives.remove(primitive);
    });

}, 'WebGL');
