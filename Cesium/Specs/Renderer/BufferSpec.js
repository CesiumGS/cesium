(function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach, afterEach, Float32Array, Uint16Array, ArrayBuffer*/
    
    describe("Buffer", function () {
        var context;
        var buffer;
        var bufferUsage = Cesium.BufferUsage;
        var indexType = Cesium.IndexDatatype;
        
        beforeEach(function () {
            context = Cesium.Specs.createContext();
        });
    
        afterEach(function () {
            if (buffer) {
                buffer = buffer.destroy();
            }

            Cesium.Specs.destroyContext(context);
        });
       
        it("creates vertex buffer", function () {
            buffer = context.createVertexBuffer(16, bufferUsage.STATIC_DRAW);
            
            expect(buffer.getSizeInBytes()).toEqual(16);
            expect(buffer.getUsage()).toEqual(bufferUsage.STATIC_DRAW);
        });
        
        it("copies array to a vertex buffer", function () {
            var sizeInBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
            var vertices = new ArrayBuffer(sizeInBytes);
            var positions = new Float32Array(vertices);
            positions[0] = 1;
            positions[1] = 2;
            positions[2] = 3;
            
            buffer = context.createVertexBuffer(sizeInBytes, bufferUsage.STATIC_DRAW);
            buffer.copyFromArrayView(vertices);
        });
        
        it("creates index buffer", function () {
            buffer = context.createIndexBuffer(6, bufferUsage.STREAM_DRAW, indexType.UNSIGNED_SHORT);
            
            expect(buffer.getSizeInBytes()).toEqual(6);
            expect(buffer.getUsage()).toEqual(bufferUsage.STREAM_DRAW);

            expect(buffer.getIndexDatatype()).toEqual(indexType.UNSIGNED_SHORT);
            expect(buffer.getBytesPerIndex()).toEqual(2);
            expect(buffer.getNumberOfIndices()).toEqual(3);
        });
    
        it("copies array to an index buffer", function () {
            var sizeInBytes = 3 * Uint16Array.BYTES_PER_ELEMENT;
            var elements = new ArrayBuffer(sizeInBytes);
            var indices = new Uint16Array(elements);
            indices[0] = 1;
            indices[1] = 2;
            indices[2] = 3;
    
            buffer = context.createIndexBuffer(sizeInBytes, bufferUsage.STATIC_DRAW, indexType.UNSIGNED_SHORT);
            buffer.copyFromArrayView(elements);
        });
    
        it("destroys", function () {
            var b = context.createIndexBuffer(3, bufferUsage.STATIC_DRAW, indexType.UNSIGNED_BYTE);
            expect(b.isDestroyed()).toEqual(false);
            b.destroy();
            expect(b.isDestroyed()).toEqual(true);
        });     
    
        it("fails to create", function () {
            expect(function () {
                buffer = context.createVertexBuffer(0, bufferUsage.STATIC_DRAW);
            }).toThrow();        
        });    
       
        it("fails to create again", function () {
            expect(function () {
                buffer = context.createVertexBuffer(4, 0);
            }).toThrow();        
        });
        
        it("fails to provide an array view", function () {
            buffer = context.createVertexBuffer(3, bufferUsage.STATIC_DRAW);
            expect(function () {
                buffer.copyFromArrayView();
            }).toThrow();        
        });

        it("fails to copy a large array view", function () {
            buffer = context.createVertexBuffer(3, bufferUsage.STATIC_DRAW);
            var elements = new ArrayBuffer(3);
            
            expect(function () {
                buffer.copyFromArrayView(elements, 1);
            }).toThrow();        
        });
                        
        it("fails to destroy", function () {
            var b = context.createIndexBuffer(3, bufferUsage.STATIC_DRAW, indexType.UNSIGNED_BYTE);
            b.destroy();
            
            expect(function () {
                b.destroy();
            }).toThrow();        
        });  
    });
}());