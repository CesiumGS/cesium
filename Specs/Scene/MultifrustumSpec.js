/*global defineSuite*/
defineSuite([
        'Core/BoundingSphere',
        'Core/BoxGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defaultValue',
        'Core/defined',
        'Core/destroyObject',
        'Core/GeometryPipeline',
        'Core/loadImage',
        'Core/Math',
        'Core/Matrix4',
        'Renderer/BufferUsage',
        'Renderer/DrawCommand',
        'Renderer/TextureMagnificationFilter',
        'Renderer/TextureMinificationFilter',
        'Scene/BillboardCollection',
        'Scene/BlendingState',
        'Scene/Pass',
        'Scene/TextureAtlas',
        'Specs/createScene',
        'ThirdParty/when'
    ], 'Scene/Multifrustum', function(
        BoundingSphere,
        BoxGeometry,
        Cartesian2,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        GeometryPipeline,
        loadImage,
        CesiumMath,
        Matrix4,
        BufferUsage,
        DrawCommand,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        BillboardCollection,
        BlendingState,
        Pass,
        TextureAtlas,
        createScene,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var context;
    var primitives;
    var atlas;

    var greenImage;
    var blueImage;
    var whiteImage;

    beforeAll(function() {
        return when.join(
            loadImage('./Data/Images/Green.png').then(function(image) {
                greenImage = image;
            }),
            loadImage('./Data/Images/Blue.png').then(function(image) {
                blueImage = image;
            }),
            loadImage('./Data/Images/White.png').then(function(image) {
                whiteImage = image;
            }));
    });

    beforeEach(function() {
        scene = createScene();
        context = scene.context;
        primitives = scene.primitives;

        var camera = scene.camera;
        camera.position = new Cartesian3();
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_X);

        camera.frustum.near = 1.0;
        camera.frustum.far = 1000000000.0;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function() {
        atlas = atlas && atlas.destroy();
        scene.destroyForSpecs();
    });

    var billboard0;
    var billboard1;
    var billboard2;

    function createBillboards() {
        atlas = new TextureAtlas({
            context : context,
            borderWidthInPixels : 1,
            initialSize : new Cartesian2(3, 3)
        });

        // ANGLE Workaround
        atlas.texture.sampler = context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });

        var billboards = new BillboardCollection();
        billboards.textureAtlas = atlas;
        billboards.destroyTextureAtlas = false;
        billboard0 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50.0),
            image : greenImage
        });
        primitives.add(billboards);

        billboards = new BillboardCollection();
        billboards.textureAtlas = atlas;
        billboards.destroyTextureAtlas = false;
        billboard1 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50000.0),
            image : blueImage
        });
        primitives.add(billboards);

        billboards = new BillboardCollection();
        billboards.textureAtlas = atlas;
        billboards.destroyTextureAtlas = false;
        billboard2 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50000000.0),
            image : whiteImage
        });
        primitives.add(billboards);

        return billboards;
    }

    it('renders primitive in closest frustum', function() {
        createBillboards();

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);

        pixels = scene.renderForSpecs();
        expect(pixels[0]).toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('renders primitive in middle frustum', function() {
        createBillboards();
        billboard0.color = new Color(1.0, 1.0, 1.0, 0.0);

        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
    });

    it('renders primitive in last frustum', function() {
        createBillboards();
        var color = new Color(1.0, 1.0, 1.0, 0.0);
        billboard0.color = color;
        billboard1.color = color;

        expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);
        expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);
    });

    it('renders primitive in last frustum with debugShowFrustums', function() {
        createBillboards();
        var color = new Color(1.0, 1.0, 1.0, 1.0);
        billboard0.color = color;
        billboard1.color = color;

        spyOn(DrawCommand.prototype, 'execute');

        scene.debugShowFrustums = true;
        scene.renderForSpecs();

        expect(DrawCommand.prototype.execute).toHaveBeenCalled();
        expect(DrawCommand.prototype.execute.calls.mostRecent().args.length).toEqual(4);
        expect(DrawCommand.prototype.execute.calls.mostRecent().args[3]).toBeDefined();
        expect(DrawCommand.prototype.execute.calls.mostRecent().args[3].fragmentShaderSource.sources[1]).toContain('czm_Debug_main');
    });

    function createPrimitive(bounded, closestFrustum) {
        bounded = defaultValue(bounded, true);
        closestFrustum = defaultValue(closestFrustum, false);

        var Primitive = function() {
            this._va = undefined;
            this._sp = undefined;
            this._rs = undefined;
            this._modelMatrix = Matrix4.fromTranslation(new Cartesian3(0.0, 0.0, -50000.0), new Matrix4());

            this.color = new Color(1.0, 1.0, 0.0, 1.0);

            var that = this;
            this._um = {
                u_color : function() {
                    return that.color;
                },
                u_model : function() {
                    return that._modelMatrix;
                }
            };
        };

        Primitive.prototype.update = function(context, frameState, commandList) {
            if (!defined(this._sp)) {
                var vs = '';
                vs += 'attribute vec4 position;';
                vs += 'void main()';
                vs += '{';
                vs += '    gl_Position = czm_modelViewProjection * position;';
                vs += closestFrustum ? '    gl_Position.z = clamp(gl_Position.z, gl_DepthRange.near, gl_DepthRange.far);' : '';
                vs += '}';
                var fs = '';
                fs += 'uniform vec4 u_color;';
                fs += 'void main()';
                fs += '{';
                fs += '    gl_FragColor = u_color;';
                fs += '}';

                var dimensions = new Cartesian3(500000.0, 500000.0, 500000.0);
                var maximumCorner = Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3());
                var minimumCorner = Cartesian3.negate(maximumCorner, new Cartesian3());
                var geometry = BoxGeometry.createGeometry(new BoxGeometry({
                    minimumCorner: minimumCorner,
                    maximumCorner: maximumCorner
                }));
                var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);
                this._va = context.createVertexArrayFromGeometry({
                    geometry: geometry,
                    attributeLocations: attributeLocations,
                    bufferUsage: BufferUsage.STATIC_DRAW
                });

                this._sp = context.createShaderProgram(vs, fs, attributeLocations);
                this._rs = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            commandList.push(new DrawCommand({
                renderState : this._rs,
                shaderProgram : this._sp,
                vertexArray : this._va,
                uniformMap : this._um,
                modelMatrix : this._modelMatrix,
                executeInClosestFrustum : closestFrustum,
                boundingVolume : bounded ? new BoundingSphere(Cartesian3.clone(Cartesian3.ZERO), 500000.0) : undefined,
                pass : Pass.OPAQUE
            }));
        };

        Primitive.prototype.destroy = function() {
            this._va = this._va && this._va.destroy();
            this._sp = this._sp && this._sp.destroy();
            return destroyObject(this);
        };

        return new Primitive();
    }

    it('renders primitive with undefined bounding volume', function() {
        var primitive = createPrimitive(false);
        primitives.add(primitive);

        expect(scene.renderForSpecs()).toEqual([255, 255, 0, 255]);
        expect(scene.renderForSpecs()).toEqual([255, 255, 0, 255]);
    });

    it('renders only in the closest frustum', function() {
        createBillboards();
        var color = new Color(1.0, 1.0, 1.0, 0.0);
        billboard0.color = color;
        billboard1.color = color;
        billboard2.color = color;

        var primitive = createPrimitive(true, true);
        primitive.color = new Color(1.0, 1.0, 0.0, 0.5);
        primitives.add(primitive);

        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);

        pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).not.toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);
    });

    it('render without a central body or any primitives', function() {
        scene.renderForSpecs();
    });

    it('does not crash when near plane is greater than or equal to the far plane', function() {
        var camera = scene.camera;
        camera.frustum.far = 1000.0;
        camera.position = new Cartesian3(0.0, 0.0, 1e12);

        createBillboards();
        scene.renderForSpecs();
    });
}, 'WebGL');
