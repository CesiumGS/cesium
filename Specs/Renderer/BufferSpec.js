/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/Matrix4',
         'Core/IndexDatatype',
         'Renderer/BufferUsage'
     ], 'Renderer/Buffer', function(
         createContext,
         destroyContext,
         Matrix4,
         IndexDatatype,
         BufferUsage) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;
    var buffer;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        if (buffer) {
            buffer = buffer.destroy();
        }

        destroyContext(context);
    });

    it('creates vertex buffer', function() {
        buffer = context.createVertexBuffer(16, BufferUsage.STATIC_DRAW);

        expect(buffer.getSizeInBytes()).toEqual(16);
        expect(buffer.getUsage()).toEqual(BufferUsage.STATIC_DRAW);
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
        expect(buffer.getSizeInBytes()).toEqual(typedArray.byteLength);
        expect(buffer.getUsage()).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('only allows typed array or size when creating a vertex buffer', function() {
        expect(function() {
            buffer = context.createVertexBuffer({}, BufferUsage.STATIC_DRAW);
        }).toThrow();
    });

    it('creates index buffer', function() {
        buffer = context.createIndexBuffer(6, BufferUsage.STREAM_DRAW, IndexDatatype.UNSIGNED_SHORT);

        expect(buffer.getSizeInBytes()).toEqual(6);
        expect(buffer.getUsage()).toEqual(BufferUsage.STREAM_DRAW);

        expect(buffer.getIndexDatatype()).toEqual(IndexDatatype.UNSIGNED_SHORT);
        expect(buffer.getBytesPerIndex()).toEqual(2);
        expect(buffer.getNumberOfIndices()).toEqual(3);
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
        expect(buffer.getSizeInBytes()).toEqual(typedArray.byteLength);
        expect(buffer.getUsage()).toEqual(BufferUsage.STATIC_DRAW);
        expect(buffer.getIndexDatatype()).toEqual(IndexDatatype.UNSIGNED_SHORT);
    });

    it('only allows typed array or size when creating a vertex buffer', function() {
        expect(function() {
            buffer = context.createIndexBuffer({}, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT);
        }).toThrow();
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
        }).toThrow();
    });

    it('fails to create again', function() {
        expect(function() {
            buffer = context.createVertexBuffer(4, 0);
        }).toThrow();
    });

    it('fails to provide an array view', function() {
        buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);
        expect(function() {
            buffer.copyFromArrayView();
        }).toThrow();
    });

    it('fails to copy a large array view', function() {
        buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);
        var elements = new ArrayBuffer(3);

        expect(function() {
            buffer.copyFromArrayView(elements, 1);
        }).toThrow();
    });

    it('fails to destroy', function() {
        var b = context.createIndexBuffer(3, BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_BYTE);
        b.destroy();

        expect(function() {
            b.destroy();
        }).toThrow();
    });
});