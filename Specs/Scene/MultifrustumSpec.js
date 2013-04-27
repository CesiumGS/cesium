/*global defineSuite*/
defineSuite([
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/destroyObject',
         'Core/BoundingSphere',
         'Core/BoxTessellator',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Color',
         'Core/defaultValue',
         'Core/Math',
         'Core/Matrix4',
         'Core/MeshFilters',
         'Core/PrimitiveType',
         'Renderer/BlendingState',
         'Renderer/BufferUsage',
         'Renderer/CommandLists',
         'Renderer/DrawCommand',
         'Renderer/TextureMinificationFilter',
         'Renderer/TextureMagnificationFilter',
         'Scene/BillboardCollection',
         'Scene/EllipsoidPrimitive'
     ], 'Scene/Multifrustum', function(
         createScene,
         destroyScene,
         destroyObject,
         BoundingSphere,
         BoxTessellator,
         Cartesian2,
         Cartesian3,
         Color,
         defaultValue,
         CesiumMath,
         Matrix4,
         MeshFilters,
         PrimitiveType,
         BlendingState,
         BufferUsage,
         CommandLists,
         DrawCommand,
         TextureMinificationFilter,
         TextureMagnificationFilter,
         BillboardCollection,
         EllipsoidPrimitive) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var context;
    var primitives;

    beforeEach(function() {
        scene = createScene();
        context = scene.getContext();
        primitives = scene.getPrimitives();

        var camera = scene.getCamera();
        camera.position = Cartesian3.ZERO;
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y;
        camera.right = Cartesian3.UNIT_X;

        camera.frustum.near = 1.0;
        camera.frustum.far = 1000000000.0;
        camera.frustum.fovy = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function() {
        destroyScene();
    });

    var greenImage;
    var blueImage;
    var whiteImage;

    it('initialize billboard image for multi-frustum tests', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        whiteImage = new Image();
        whiteImage.src = './Data/Images/White.png';

        waitsFor(function() {
            return greenImage.complete && blueImage.complete && whiteImage.complete;
        }, 'Load .png file(s) for billboard collection test.', 3000);
    });

    var billboard0;
    var billboard1;
    var billboard2;

    function createBillboards() {
        var atlas = context.createTextureAtlas({images : [greenImage, blueImage, whiteImage], borderWidthInPixels : 1, initialSize : new Cartesian2(3, 3)});

        // ANGLE Workaround
        atlas.getTexture().setSampler(context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        }));

        var billboards = new BillboardCollection();
        billboards.setTextureAtlas(atlas);
        billboard0 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50.0),
            imageIndex : 0
        });
        primitives.add(billboards);

        billboards = new BillboardCollection();
        billboards.setTextureAtlas(atlas);
        billboard1 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50000.0),
            imageIndex : 1
        });
        primitives.add(billboards);

        billboards = new BillboardCollection();
        billboards.setTextureAtlas(atlas);
        billboard2 = billboards.add({
            position : new Cartesian3(0.0, 0.0, -50000000.0),
            imageIndex : 2
        });
        primitives.add(billboards);

        return billboards;
    }

    it('renders primitive in closest frustum', function() {
        createBillboards();

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders primitive in middle frustum', function() {
        createBillboards();
        billboard0.setColor(new Color(1.0, 1.0, 1.0, 0.0));

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders primitive in last frustum', function() {
        createBillboards();
        var color = new Color(1.0, 1.0, 1.0, 0.0);
        billboard0.setColor(color);
        billboard1.setColor(color);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    function createPrimitive(bounded, closestFrustum) {
        bounded = defaultValue(bounded, true);
        closestFrustum = defaultValue(closestFrustum, false);

        var Primitive = function() {
            this._va = undefined;
            this._sp = undefined;
            this._rs = undefined;
            this._modelMatrix = Matrix4.fromTranslation(new Cartesian3(0.0, 0.0, -50000.0));

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

        Primitive.prototype.update = function(context, frameState, commandLists) {
            if (typeof this._sp === 'undefined') {
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
                var maximumCorner = dimensions.multiplyByScalar(0.5);
                var minimumCorner = maximumCorner.negate();
                var mesh = BoxTessellator.compute({
                    minimumCorner: minimumCorner,
                    maximumCorner: maximumCorner
                });
                var attributeIndices = MeshFilters.createAttributeIndices(mesh);
                this._va = context.createVertexArrayFromMesh({
                    mesh: mesh,
                    attributeIndices: attributeIndices,
                    bufferUsage: BufferUsage.STATIC_DRAW
                });

                this._sp = context.getShaderCache().getShaderProgram(vs, fs, attributeIndices);
                this._rs = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND
                });
            }

            var command = new DrawCommand();
            command.primitiveType = PrimitiveType.TRIANGLES;
            command.renderState = this._rs;
            command.shaderProgram = this._sp;
            command.vertexArray = this._va;
            command.uniformMap = this._um;
            command.modelMatrix = this._modelMatrix;
            command.executeInClosestFrustum = closestFrustum;
            command.boundingVolume = bounded ? new BoundingSphere(Cartesian3.ZERO.clone(), 500000.0) : undefined;

            var commandList = new CommandLists();
            commandList.colorList.push(command);
            commandLists.push(commandList);
        };

        Primitive.prototype.destroy = function() {
            this._va = this._va && this._va.destroy();
            this._sp = this._sp && this._sp.release();
            return destroyObject(this);
        };

        return new Primitive();
    }

    it('renders primitive with undefined bounding volume', function() {
        var primitive = createPrimitive(false);
        primitives.add(primitive);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);

        scene.initializeFrame();
        scene.render();
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);
    });

    it('renders only in the closest frustum', function() {
        createBillboards();
        var color = new Color(1.0, 1.0, 1.0, 0.0);
        billboard0.setColor(color);
        billboard1.setColor(color);
        billboard2.setColor(color);

        var primitive = createPrimitive(true, true);
        primitive.color = new Color(1.0, 1.0, 0.0, 0.5);
        primitives.add(primitive);

        scene.initializeFrame();
        scene.render();
        // Epsilon of 1 because AMD and Intel HD 4000 gives 128
        expect(context.readPixels()).toEqualEpsilon([127, 127, 0, 255], 1);

        scene.initializeFrame();
        scene.render();
        // Epsilon of 1 because AMD and Intel HD 4000 gives 128
        expect(context.readPixels()).toEqualEpsilon([127, 127, 0, 255], 1);
    });

    it('render without a central body or any primitives', function() {
        expect(function() {
            scene.initializeFrame();
            scene.render();
        }).not.toThrow();
    });

    it('does not crash when near plane is greater than or equal to the far plane', function() {
        var camera = scene.getCamera();
        camera.frustum.far = 1000.0;
        camera.position = new Cartesian3(0.0, 0.0, 1e12);

        createBillboards();
        expect(function() {
            scene.initializeFrame();
            scene.render();
        }).not.toThrow();
    });
}, 'WebGL');