/*global defineSuite*/
defineSuite([
        'Renderer/Buffer',
        'Core/IndexDatatype',
        'Renderer/BufferUsage',
        'Specs/createContext'
    ], function(
        Buffer,
        IndexDatatype,
        BufferUsage,
        createContext) {
    'use strict';

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

    it('throws when creating a vertex buffer with no context', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                sizeInBytes : 4,
                usage : BufferUsage.STATIC_DRAW
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a vertex buffer with an invalid typed array', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : {},
                usage : BufferUsage.STATIC_DRAW
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a vertex buffer with both a typed array and size in bytes', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : new Float32Array([0, 0, 0, 1]),
                sizeInBytes : 16,
                usage : BufferUsage.STATIC_DRAW
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a vertex buffer without a typed array or size in bytes', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                context : context,
                usage : BufferUsage.STATIC_DRAW
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a vertex buffer with invalid usage', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                context : context,
                sizeInBytes : 16,
                usage : 0
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a vertex buffer with size of zero', function() {
        expect(function() {
            buffer = Buffer.createVertexBuffer({
                context : context,
                sizeInBytes : 0,
                usage : BufferUsage.STATIC_DRAW
            });
        }).toThrowDeveloperError();
    });

    it('creates vertex buffer', function() {
        buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 16,
            usage : BufferUsage.STATIC_DRAW
        });

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

        buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : sizeInBytes,
            usage : BufferUsage.STATIC_DRAW
        });
        buffer.copyFromArrayView(vertices);
    });

    it('can create a vertex buffer from a typed array', function() {
        var typedArray = new Float32Array(3 * Float32Array.BYTES_PER_ELEMENT);
        typedArray[0] = 1.0;
        typedArray[1] = 2.0;
        typedArray[2] = 3.0;

        buffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW
        });
        expect(buffer.sizeInBytes).toEqual(typedArray.byteLength);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('can create a vertex buffer from a size in bytes', function() {
        buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 4,
            usage : BufferUsage.STATIC_DRAW
        });
        expect(buffer.sizeInBytes).toEqual(4);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('throws when creating an index buffer with no context', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                sizeInBytes : 4,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer with an invalid typed array', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                typedArray : {},
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer with both a typed array and size in bytes', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                typedArray : new Uint16Array([0, 1, 2, 0, 2, 3]),
                sizeInBytes : 12,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer without a typed array or size in bytes', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer with invalid usage', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                sizeInBytes : 16,
                usage : "invalid",
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer with invalid index data type', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                sizeInBytes : 16,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : 'invalid'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating an index buffer with size of zero', function() {
        expect(function() {
            buffer = Buffer.createIndexBuffer({
                context : context,
                sizeInBytes : 0,
                usage : BufferUsage.STATIC_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_SHORT
            });
        }).toThrowDeveloperError();
    });

    it('creates index buffer', function() {
        buffer = Buffer.createIndexBuffer({
            context : context,
            sizeInBytes : 6,
            usage : BufferUsage.STREAM_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });

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

        buffer = Buffer.createIndexBuffer({
            context : context,
            sizeInBytes : sizeInBytes,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });
        buffer.copyFromArrayView(elements);
    });

    it('can create an index buffer from a typed array', function() {
        var typedArray = new Uint16Array(3 * Uint16Array.BYTES_PER_ELEMENT);
        typedArray[0] = 1;
        typedArray[1] = 2;
        typedArray[2] = 3;

        buffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : typedArray,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });
        expect(buffer.sizeInBytes).toEqual(typedArray.byteLength);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
        expect(buffer.indexDatatype).toEqual(IndexDatatype.UNSIGNED_SHORT);
    });

    it('can create an index buffer from a size in bytes', function() {
        buffer = Buffer.createIndexBuffer({
            context : context,
            sizeInBytes : 6,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_SHORT
        });
        expect(buffer.sizeInBytes).toEqual(6);
        expect(buffer.usage).toEqual(BufferUsage.STATIC_DRAW);
        expect(buffer.indexDatatype).toEqual(IndexDatatype.UNSIGNED_SHORT);
    });

    it('destroys', function() {
        var b = Buffer.createIndexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_BYTE
        });
        expect(b.isDestroyed()).toEqual(false);
        b.destroy();
        expect(b.isDestroyed()).toEqual(true);
    });

    it('fails to provide an array view', function() {
        buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });
        expect(function() {
            buffer.copyFromArrayView();
        }).toThrowDeveloperError();
    });

    it('fails to copy a large array view', function() {
        buffer = Buffer.createVertexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW
        });
        var elements = new ArrayBuffer(3);

        expect(function() {
            buffer.copyFromArrayView(elements, 1);
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var b = Buffer.createIndexBuffer({
            context : context,
            sizeInBytes : 3,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_BYTE
        });
        b.destroy();

        expect(function() {
            b.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
