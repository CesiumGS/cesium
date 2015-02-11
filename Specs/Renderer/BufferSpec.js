/*global defineSuite*/
defineSuite([
        'Core/IndexDatatype',
        'Renderer/BufferUsage',
        'Specs/createContext'
    ], 'Renderer/Buffer', function(
        IndexDatatype,
        BufferUsage,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var buffer;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    afterEach(function() {
        if (buffer) {
            buffer = buffer.destroy();
        }
    });

    it('creates vertex buffer', function() {
        buffer = context.createVertexBuffer(16, BufferUsage.STATIC_DRAW);

        expect(buffer.sizeInBytes).toEqual(16);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('copies array to a vertex buffer', function() {
        var sizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
        var vertices = new ArrayBuffer(sizeInBytes);
        var positions = new Float32Array(vertices);
        positions[0] = 1.0;
        positions[1] = 2.0;
        positions[2] = 3.0;

        buffer = context.createVertexBuffer(sizeInBytes, BufferUsage.STATIC_DRAW);
        buffer.copyFromArrayView(vertices);
    });

    it('can create a vertex buffer from a typed array', function() {
        var typedArray = new Float32Array(3 * Float32Array.BYTES_PER_ELEMENT);
        typedArray[0] = 1.0;
        typedArray[1] = 2.0;
        typedArray[2] = 3.0;

        buffer = context.createVertexBuffer(typedArray, BufferUsage.STATIC_DRAW);
        expect(buffer.sizeInBytes).toEqual(typedArray.byteLength);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('only allows typed array or size when creating a vertex buffer', function() {
        expect(function() {
            buffer = context.createVertexBuffer({}, BufferUsage.STATIC_DRAW);
        }).toThrowDeveloperError();
    });

    it('creates index buffer', function() {
        buffer = context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_SHORT);

        expect(buffer.sizeInBytes).toEqual(6);
        expect(buffer.usage).toEqual(BufferUsage.STREAM_DRAW);

        expect(buffer.indexDatatype).toEqual(IndexDatatype.UNSIGNED_SHORT);
        expect(buffer.bytesPerIndex).toEqual(2);
        expect(buffer.numberOfIndices).toEqual(3);
    });

    it('copies array to an index buffer', function() {
        var sizeInBytes = 3 * Uint16Array.BYTES_PER_ELEMENT;
        var elements = new ArrayBuffer(sizeInBytes);
        var indices = new Uint16Array(elements);
        indices[0] = 1;
        indices[1] = 2;
        indices[2] = 3;

        buffer = context.createIndexBuffer(sizeInBytes, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        buffer.copyFromArrayView(elements);
    });

    it('can create an index buffer from a typed array', function() {
        var typedArray = new Uint16Array(3 * Uint16Array.BYTES_PER_ELEMENT);
        typedArray[0] = 1;
        typedArray[1] = 2;
        typedArray[2] = 3;

        buffer = context.createIndexBuffer(typedArray, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        expect(buffer.sizeInBytes).toEqual(typedArray.byteLength);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
        expect(buffer.indexDatatype).toEqual(IndexDatatype.UNSIGNED_SHORT);
    });

    it('only allows typed array or size when creating a vertex buffer', function() {
        expect(function() {
            buffer = context.createIndexBuffer({}, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        }).toThrowDeveloperError();
    });

    it('destroys', function() {
        var b = context.createIndexBuffer(3, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_BYTE);
        expect(b.isDestroyed()).toEqual(false);
        b.destroy();
        expect(b.isDestroyed()).toEqual(true);
    });

    it('fails to create', function() {
        expect(function() {
            buffer = context.createVertexBuffer(0, BufferUsage.STATIC_DRAW);
        }).toThrowDeveloperError();
    });

    it('fails to create again', function() {
        expect(function() {
            buffer = context.createVertexBuffer(4, 0);
        }).toThrowDeveloperError();
    });

    it('fails to provide an array view', function() {
        buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);
        expect(function() {
            buffer.copyFromArrayView();
        }).toThrowDeveloperError();
    });

    it('fails to copy a large array view', function() {
        buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);
        var elements = new ArrayBuffer(3);

        expect(function() {
            buffer.copyFromArrayView(elements, 1);
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var b = context.createIndexBuffer(3, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_BYTE);
        b.destroy();

        expect(function() {
            b.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');