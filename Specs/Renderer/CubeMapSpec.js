/*global defineSuite*/
defineSuite([
        'Core/Cartesian3',
        'Core/Color',
        'Core/PixelFormat',
        'Core/PrimitiveType',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/PixelDatatype',
        'Renderer/TextureMagnificationFilter',
        'Renderer/TextureMinificationFilter',
        'Renderer/TextureWrap',
        'Specs/createContext',
        'Specs/destroyContext'
    ], 'Renderer/CubeMap', function(
        Cartesian3,
        Color,
        PixelFormat,
        PrimitiveType,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        createContext,
        destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var sp;
    var va;
    var cubeMap;

    var greenImage;
    var blueImage;
    var blueAlphaImage;
    var blueOverRedImage;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        sp = sp && sp.destroy();
        va = va && va.destroy();
        cubeMap = cubeMap && cubeMap.destroy();
    });

    it('create images', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        blueAlphaImage = new Image();
        blueAlphaImage.src = './Data/Images/BlueAlpha.png';

        blueOverRedImage = new Image();
        blueOverRedImage.src = './Data/Images/BlueOverRed.png';

        waitsFor(function() {
            return greenImage.complete && blueImage.complete && blueAlphaImage.complete && blueOverRedImage.complete;
        }, 'Load .png file(s) for texture test.', 3000);
    });

    it('gets the pixel format', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(cubeMap.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.positiveX.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.negativeX.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.positiveY.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.negativeY.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.positiveZ.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(cubeMap.negativeZ.pixelFormat).toEqual(PixelFormat.RGBA);
    });

    it('gets the pixel datatype', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(cubeMap.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.positiveX.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.negativeX.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.positiveY.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.negativeY.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.positiveZ.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(cubeMap.negativeZ.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it('default sampler returns undefined', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        var sampler = cubeMap.sampler;
        expect(sampler).toBeUndefined();
    });

    it('default sampler returns undefined, data type is FLOAT ', function() {
        if (context.floatingPointTexture) {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelDatatype : PixelDatatype.FLOAT
            });

            var sampler = cubeMap.sampler;
            expect(sampler).toBeUndefined();
        }
    });

    it('sets a sampler', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        var sampler = context.createSampler({
            wrapS : TextureWrap.REPEAT,
            wrapT : TextureWrap.MIRRORED_REPEAT,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
        cubeMap.sampler = sampler;

        var s = cubeMap.sampler;
        expect(s.wrapS).toEqual(sampler.wrapS);
        expect(s.wrapT).toEqual(sampler.wrapT);
        expect(s.minificationFilter).toEqual(sampler.minificationFilter);
        expect(s.magnificationFilter).toEqual(sampler.magnificationFilter);
    });

    it('gets width and height', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(cubeMap.width).toEqual(16);
        expect(cubeMap.height).toEqual(16);
    });

    it('gets flip Y', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16,
            flipY : true
        });

        expect(cubeMap.flipY).toEqual(true);
    });

    it('draws with a cube map', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : blueImage,
                negativeX : greenImage,
                positiveY : blueImage,
                negativeY : greenImage,
                positiveZ : blueImage,
                negativeZ : greenImage
            }
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_texture;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // +X is blue
        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -X is green
        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        // +Y is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -Y is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        // +Z is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -Z is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('draws with a cube map with premultiplied alpha', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : blueAlphaImage,
                negativeX : blueAlphaImage,
                positiveY : blueAlphaImage,
                negativeY : blueAlphaImage,
                positiveZ : blueAlphaImage,
                negativeZ : blueAlphaImage
            },
            preMultiplyAlpha : true
        });
        expect(cubeMap.preMultiplyAlpha).toEqual(true);

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_texture;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // +X is blue
        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);

        // -X is green
        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);

        // +Y is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);

        // -Y is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);

        // +Z is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);

        // -Z is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 127, 127]);
    });

    it('draws the context default cube map', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_texture;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = context.defaultCubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('creates a cube map with typed arrays', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 0, 0, 255])
                },
                negativeX : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 0, 255, 0])
                },
                positiveY : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 255, 0, 0])
                },
                negativeY : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([255, 0, 0, 0])
                },
                positiveZ : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 0, 255, 255])
                },
                negativeZ : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([255, 255, 0, 0])
                }
            }
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_texture;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 0, 0]);
    });

    it('creates a cube map with floating-point textures', function() {
        if (context.floatingPointTexture) {
            var positiveXColor = new Color(0.0, 0.0, 0.0, 1.0);
            var negativeXColor = new Color(0.0, 0.0, 1.0, 0.0);
            var positiveYColor = new Color(0.0, 1.0, 0.0, 0.0);
            var negativeYColor = new Color(1.0, 0.0, 0.0, 0.0);
            var positiveZColor = new Color(0.0, 0.0, 1.0, 1.0);
            var negativeZColor = new Color(1.0, 1.0, 0.0, 0.0);

            cubeMap = context.createCubeMap({
                source : {
                    positiveX : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([positiveXColor.red, positiveXColor.green, positiveXColor.blue, positiveXColor.alpha])
                    },
                    negativeX : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([negativeXColor.red, negativeXColor.green, negativeXColor.blue, negativeXColor.alpha])
                    },
                    positiveY : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([positiveYColor.red, positiveYColor.green, positiveYColor.blue, positiveYColor.alpha])
                    },
                    negativeY : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([negativeYColor.red, negativeYColor.green, negativeYColor.blue, negativeYColor.alpha])
                    },
                    positiveZ : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([positiveZColor.red, positiveZColor.green, positiveZColor.blue, positiveZColor.alpha])
                    },
                    negativeZ : {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Float32Array([negativeZColor.red, negativeZColor.green, negativeZColor.blue, negativeZColor.alpha])
                    }
                },
                pixelDatatype : PixelDatatype.FLOAT
            });

            var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            var fs =
                'uniform samplerCube u_texture;' +
                'uniform mediump vec3 u_direction;' +
                'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
            sp = context.createShaderProgram(vs, fs, {
                position : 0
            });
            sp.allUniforms.u_texture.value = cubeMap;

            va = context.createVertexArray([{
                vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            }]);

            var command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : va
            });

            sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual(positiveXColor.toBytes());

            sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual(negativeXColor.toBytes());

            sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual(positiveYColor.toBytes());

            sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual(negativeYColor.toBytes());

            sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
            command.execute(context);
            expect(context.readPixels()).toEqual(positiveZColor.toBytes());

            sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
            command.execute(context);
            expect(context.readPixels()).toEqual(negativeZColor.toBytes());
        }
    });

    it('creates a cube map with typed arrays and images', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : blueImage,
                negativeX : greenImage,
                positiveY : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 255, 0, 0])
                },
                negativeY : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([255, 0, 0, 0])
                },
                positiveZ : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([0, 0, 255, 255])
                },
                negativeZ : {
                    width : 1,
                    height : 1,
                    arrayBufferView : new Uint8Array([255, 255, 0, 0])
                }
            }
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_texture;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_texture.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 0, 0]);
    });

    it('copies to a cube map', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });
        cubeMap.positiveX.copyFrom(blueImage);
        cubeMap.negativeX.copyFrom(greenImage);
        cubeMap.positiveY.copyFrom(blueImage);
        cubeMap.negativeY.copyFrom(greenImage);
        cubeMap.positiveZ.copyFrom(blueImage);
        cubeMap.negativeZ.copyFrom(greenImage);

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_cubeMap;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_cubeMap, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // +X is blue
        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -X is green
        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        // +Y is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -Y is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        // +Z is blue
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // -Z is green
        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('copies from a typed array', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });
        cubeMap.positiveX.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([0, 0, 0, 255])
        });
        cubeMap.negativeX.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([0, 0, 255, 0])
        });
        cubeMap.positiveY.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([0, 255, 0, 0])
        });
        cubeMap.negativeY.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([255, 0, 0, 0])
        });
        cubeMap.positiveZ.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([0, 0, 255, 255])
        });
        cubeMap.negativeZ.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([255, 255, 0, 0])
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_cubeMap;' +
            'uniform mediump vec3 u_direction;' +
            'void main() { gl_FragColor = textureCube(u_cubeMap, normalize(u_direction)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 0]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 0, 0]);
    });

    it('copies from the framebuffer', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });
        cubeMap.positiveX.copyFrom(blueImage);

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_cubeMap;' +
            'void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });

        // +X is blue
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        // Clear framebuffer to red and copy to +X face
        var clearCommand = new ClearCommand({
            color : new Color (1.0, 0.0, 0.0, 1.0)
        });

        clearCommand.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
        cubeMap.positiveX.copyFromFramebuffer();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // +X is red now
        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('draws with a cube map and a texture', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : greenImage,
                negativeX : greenImage,
                positiveY : greenImage,
                negativeY : greenImage,
                positiveZ : greenImage,
                negativeZ : greenImage
            }
        });

        var texture = context.createTexture2D({
            source : blueImage
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_cubeMap;' +
            'uniform sampler2D u_texture;' +
            'void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)) + texture2D(u_texture, vec2(0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;
        sp.allUniforms.u_texture.value = texture;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 255, 255, 255]);

        texture = texture.destroy();
    });

    it('generates mipmaps', function() {
        cubeMap = context.createCubeMap({
            source : {
                positiveX : blueImage,
                negativeX : greenImage,
                positiveY : blueImage,
                negativeY : greenImage,
                positiveZ : blueImage,
                negativeZ : greenImage
            }
        });

        cubeMap.generateMipmap();
        cubeMap.sampler = context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        });

        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'uniform samplerCube u_cubeMap;' +
            'void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }';
        sp = context.createShaderProgram(vs, fs, {
            position : 0
        });
        sp.allUniforms.u_cubeMap.value = cubeMap;

        va = context.createVertexArray([{
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('destroys', function() {
        var c = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(c.isDestroyed()).toEqual(false);
        c.destroy();
        expect(c.isDestroyed()).toEqual(true);
    });

    it('fails to create (options)', function() {
        expect(function() {
            cubeMap = context.createCubeMap();
        }).toThrowDeveloperError();
    });

    it('fails to create (source)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({});
        }).toThrowDeveloperError();
    });

    it('fails to create (width, no height)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 16
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (width != height)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 32
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (small width)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 0,
                height : 0
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (large width)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : context.maximumCubeMapSize + 1,
                height : context.maximumCubeMapSize + 1
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (PixelFormat)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelFormat : 'invalid PixelFormat'
            });
        }).toThrowDeveloperError();
    });

    it('throws during creation if pixel format is depth or depth-stencil', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelFormat : PixelFormat.DEPTH_COMPONENT
            });
        }).toThrowDeveloperError();
    });

    it('throws during creation if pixelDatatype is FLOAT, and OES_texture_float is not supported', function() {
        if (!context.floatingPointTexture) {
            expect(function() {
                cubeMap = context.createCubeMap({
                    width : 16,
                    height : 16,
                    pixelDatatype : PixelDatatype.FLOAT
                });
            }).toThrowDeveloperError();
        }
    });

    it('fails to create (pixelDatatype)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : 'invalid pixelDatatype'
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (source)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                source : {}
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (source width and height)', function() {
        expect(function() {
            cubeMap = context.createCubeMap({
                source : {
                    positiveX : greenImage, // 1x1
                    negativeX : greenImage, // 1x1
                    positiveY : greenImage, // 1x1
                    negativeY : greenImage, // 1x1
                    positiveZ : greenImage, // 1x1
                    negativeZ : blueOverRedImage // 1x2
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to copy from an image (source)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(function() {
            cubeMap.positiveX.copyFrom();
        }).toThrowDeveloperError();
    });

    it('fails to copy from an image (xOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });
        var image = new Image();

        expect(function() {
            cubeMap.positiveY.copyFrom(image, -1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from an image (yOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });
        var image = new Image();

        expect(function() {
            cubeMap.positiveZ.copyFrom(image, 0, -1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from an image (width)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });
        var image = new Image();
        image.width = 16 + 1;

        expect(function() {
            cubeMap.negativeX.copyFrom(image);
        }).toThrowDeveloperError();
    });

    it('fails to copy from an image (height)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });
        var image = new Image();
        image.height = 16 + 1;

        expect(function() {
            cubeMap.negativeY.copyFrom(image);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (invalid data type)', function() {
        if (context.floatingPointTexture) {
            cubeMap = context.createCubeMap({
                width : 1,
                height : 1,
                pixelDatatype : PixelDatatype.FLOAT
            });

            expect(function() {
                cubeMap.positiveX.copyFromFramebuffer();
            }).toThrowDeveloperError();
        }
    });

    it('fails to copy from the frame buffer (xOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.positiveX.copyFromFramebuffer(-1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (yOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.positiveY.copyFromFramebuffer(0, -1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (framebufferXOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.positiveZ.copyFromFramebuffer(0, 0, -1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (framebufferYOffset)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.negativeX.copyFromFramebuffer(0, 0, 0, -1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (width)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.negativeY.copyFromFramebuffer(0, 0, 0, 0, cubeMap.width + 1);
        }).toThrowDeveloperError();
    });

    it('fails to copy from the frame buffer (height)', function() {
        cubeMap = context.createCubeMap({
            width : 1,
            height : 1
        });

        expect(function() {
            cubeMap.negativeZ.copyFromFramebuffer(0, 0, 0, 0, 0, cubeMap.height + 1);
        }).toThrowDeveloperError();
    });

    it('fails to generate mipmaps (width)', function() {
        cubeMap = context.createCubeMap({
            width : 3,
            height : 3
        });

        expect(function() {
            cubeMap.generateMipmap();
        }).toThrowDeveloperError();
    });

    it('fails to generate mipmaps (hint)', function() {
        cubeMap = context.createCubeMap({
            width : 16,
            height : 16
        });

        expect(function() {
            cubeMap.generateMipmap('invalid hint');
        }).toThrowDeveloperError();
    });

    it('throws when data type is FLOAT and minification filter is not NEAREST or NEAREST_MIPMAP_NEAREST', function() {
        if (context.floatingPointTexture) {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelDatatype : PixelDatatype.FLOAT
            });

            expect(function() {
                cubeMap.sampler = context.createSampler({
                    minificationFilter : TextureMinificationFilter.LINEAR
                });
            }).toThrowDeveloperError();
        }
    });

    it('throws when data type is FLOAT and magnification filter is not NEAREST', function() {
        if (context.floatingPointTexture) {
            cubeMap = context.createCubeMap({
                width : 16,
                height : 16,
                pixelDatatype : PixelDatatype.FLOAT
            });

            expect(function() {
                cubeMap.sampler = context.createSampler({
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                });
            }).toThrowDeveloperError();
        }
    });

    it('fails to destroy', function() {
        var c = context.createCubeMap({
            width : 16,
            height : 16
        });
        c.destroy();

        expect(function() {
            c.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
