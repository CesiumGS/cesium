/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/ComponentDatatype',
        './BufferUsage'
    ], function(
        DeveloperError,
        destroyObject,
        ComponentDatatype,
        BufferUsage) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name VertexArrayFacade
     *
     * @constructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} At least one attribute is required.
     * @exception {DeveloperError} Attribute must have a componentsPerAttribute.
     * @exception {DeveloperError} Attribute must have a valid componentDatatype or not specify it.
     * @exception {DeveloperError} Attribute must have a valid usage or not specify it.
     * @exception {DeveloperError} Index n is used by more than one attribute.
     */
    function VertexArrayFacade(context, attributes, sizeInVertices) {
        if (!context) {
            throw new DeveloperError('context is required.');
        }

        if (!attributes || (attributes.length === 0)) {
            throw new DeveloperError('At least one attribute is required.');
        }

        var attrs = VertexArrayFacade._verifyAttributes(attributes);

        sizeInVertices = sizeInVertices || 0;

        var staticAttributes = [];
        var streamAttributes = [];
        var dynamicAttributes = [];
        var precreatedAttributes = [];

        var length = attrs.length;
        for ( var i = 0; i < length; ++i) {
            var attribute = attrs[i];

            // If the attribute already has a vertex buffer, we do not need
            // to manage a vertex buffer or typed array for it.
            if (attribute.vertexBuffer) {
                precreatedAttributes.push(attribute);
            } else {
                switch (attribute.usage) {
                case BufferUsage.STATIC_DRAW:
                    staticAttributes.push(attribute);
                    break;
                case BufferUsage.STREAM_DRAW:
                    streamAttributes.push(attribute);
                    break;
                case BufferUsage.DYNAMIC_DRAW:
                    dynamicAttributes.push(attribute);
                    break;
                }
            }
        }

        // Sort attributes by the size of their components.  From left to right, a vertex stores floats, shorts, and then bytes.
        function compare(left, right) {
            return right.componentDatatype.sizeInBytes - left.componentDatatype.sizeInBytes;
        }

        staticAttributes.sort(compare);
        streamAttributes.sort(compare);
        dynamicAttributes.sort(compare);

        var staticVertexSizeInBytes = VertexArrayFacade._vertexSizeInBytes(staticAttributes);
        var streamVertexSizeInBytes = VertexArrayFacade._vertexSizeInBytes(streamAttributes);
        var dynamicVertexSizeInBytes = VertexArrayFacade._vertexSizeInBytes(dynamicAttributes);

        this._size = 0;

        this._static = {
            vertexSizeInBytes : staticVertexSizeInBytes,

            vertexBuffer : undefined,
            usage : BufferUsage.STATIC_DRAW,
            needsCommit : false,

            arrayBuffer : undefined,
            arrayViews : VertexArrayFacade._createArrayViews(staticAttributes, staticVertexSizeInBytes)
        };

        this._stream = {
            vertexSizeInBytes : streamVertexSizeInBytes,

            vertexBuffer : undefined,
            usage : BufferUsage.STREAM_DRAW,
            needsCommit : false,

            arrayBuffer : undefined,
            arrayViews : VertexArrayFacade._createArrayViews(streamAttributes, streamVertexSizeInBytes)
        };

        this._dynamic = {
            vertexSizeInBytes : dynamicVertexSizeInBytes,

            vertexBuffer : undefined,
            usage : BufferUsage.DYNAMIC_DRAW,
            needsCommit : false,

            arrayBuffer : undefined,
            arrayViews : VertexArrayFacade._createArrayViews(dynamicAttributes, dynamicVertexSizeInBytes)
        };

        this._precreated = precreatedAttributes;
        this._context = context;

        /**
         * DOC_TBA
         */
        this.writers = undefined;

        /**
         * DOC_TBA
         */
        this.va = undefined;

        this.resize(sizeInVertices);
    }

    VertexArrayFacade._verifyAttributes = function(attributes) {
        var attrs = [];

        for ( var i = 0; i < attributes.length; ++i) {
            var attribute = attributes[i];

            var attr = {
                index : (typeof attribute.index === 'undefined') ? i : attribute.index,
                enabled : (typeof attribute.enabled === 'undefined') ? true : attribute.enabled,
                componentsPerAttribute : attribute.componentsPerAttribute,
                componentDatatype : attribute.componentDatatype || ComponentDatatype.FLOAT,
                normalize : attribute.normalize || false,

                // There will be either a vertexBuffer or an [optional] usage.
                vertexBuffer : attribute.vertexBuffer,
                usage : attribute.usage || BufferUsage.STATIC_DRAW
            };
            attrs.push(attr);

            if ((attr.componentsPerAttribute !== 1) && (attr.componentsPerAttribute !== 2) && (attr.componentsPerAttribute !== 3) && (attr.componentsPerAttribute !== 4)) {
                throw new DeveloperError('attribute.componentsPerAttribute must be in the range [1, 4].');
            }

            var datatype = attr.componentDatatype;
            if (!ComponentDatatype.validate(datatype)) {
                throw new DeveloperError('Attribute must have a valid componentDatatype or not specify it.');
            }

            if (!BufferUsage.validate(attr.usage)) {
                throw new DeveloperError('Attribute must have a valid usage or not specify it.');
            }
        }

        // Verify all attribute names are unique
        var uniqueIndices = new Array(attrs.length);
        for ( var j = 0; j < attrs.length; ++j) {
            var index = attrs[j].index;
            if (uniqueIndices[index]) {
                throw new DeveloperError('Index ' + index + ' is used by more than one attribute.');
            }
            uniqueIndices[index] = true;
        }

        return attrs;
    };

    VertexArrayFacade._vertexSizeInBytes = function(attributes) {
        var sizeInBytes = 0;

        var length = attributes.length;
        for ( var i = 0; i < length; ++i) {
            var attribute = attributes[i];
            sizeInBytes += (attribute.componentsPerAttribute * attribute.componentDatatype.sizeInBytes);
        }

        var maxComponentSizeInBytes = (length > 0) ? attributes[0].componentDatatype.sizeInBytes : 0; // Sorted by size
        var remainder = (maxComponentSizeInBytes > 0) ? (sizeInBytes % maxComponentSizeInBytes) : 0;
        var padding = (remainder === 0) ? 0 : (maxComponentSizeInBytes - remainder);
        sizeInBytes += padding;

        return sizeInBytes;
    };

    VertexArrayFacade._createArrayViews = function(attributes, vertexSizeInBytes) {
        var views = [];
        var offsetInBytes = 0;

        var length = attributes.length;
        for ( var i = 0; i < length; ++i) {
            var attribute = attributes[i];
            var componentDatatype = attribute.componentDatatype;

            views.push({
                index : attribute.index,
                enabled : attribute.enabled,
                componentsPerAttribute : attribute.componentsPerAttribute,
                componentDatatype : componentDatatype,
                normalize : attribute.normalize,

                offsetInBytes : offsetInBytes,
                vertexSizeInComponentType : vertexSizeInBytes / componentDatatype.sizeInBytes,

                view : undefined
            });

            offsetInBytes += (attribute.componentsPerAttribute * componentDatatype.sizeInBytes);
        }

        return views;
    };

    /**
     * DOC_TBA
     *
     * Invalidates writers.  Can't render again until commit is called.
     *
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.resize = function(sizeInVertices) {
        this._size = sizeInVertices;

        VertexArrayFacade._resize(this._static, this._size);
        VertexArrayFacade._resize(this._stream, this._size);
        VertexArrayFacade._resize(this._dynamic, this._size);

        // Reserving invalidates the writers, so if client's cache them, they need to invalidate their cache.
        this.writers = [];
        VertexArrayFacade._appendWriters(this.writers, this._static);
        VertexArrayFacade._appendWriters(this.writers, this._stream);
        VertexArrayFacade._appendWriters(this.writers, this._dynamic);

        // VAs are recreated next time commit is called.
        this._destroyVA();
    };

    VertexArrayFacade._resize = function(buffer, size) {
        if (buffer.vertexSizeInBytes > 0) {
            // Create larger array buffer
            var arrayBuffer = new ArrayBuffer(size * buffer.vertexSizeInBytes);

            // Copy contents from previous array buffer
            if (buffer.arrayBuffer) {
                var destView = new Uint8Array(arrayBuffer);
                var sourceView = new Uint8Array(buffer.arrayBuffer);
                var sourceLength = sourceView.length;
                for ( var j = 0; j < sourceLength; ++j) {
                    destView[j] = sourceView[j];
                }
            }

            // Create typed views into the new array buffer
            var views = buffer.arrayViews;
            var length = views.length;
            for ( var i = 0; i < length; ++i) {
                var view = views[i];
                view.view = view.componentDatatype.createArrayBufferView(arrayBuffer, view.offsetInBytes);
            }

            buffer.arrayBuffer = arrayBuffer;
        }
    };

    var createWriters = [
    // 1 component per attribute
    function(buffer, view, vertexSizeInComponentType) {
        return function(index, attribute) {
            view[index * vertexSizeInComponentType] = attribute;
            buffer.needsCommit = true;
        };
    },

    // 2 component per attribute
    function(buffer, view, vertexSizeInComponentType) {
        return function(index, component0, component1) {
            var i = index * vertexSizeInComponentType;
            view[i] = component0;
            view[i + 1] = component1;
            buffer.needsCommit = true;
        };
    },

    // 3 component per attribute
    function(buffer, view, vertexSizeInComponentType) {
        return function(index, component0, component1, component2) {
            var i = index * vertexSizeInComponentType;
            view[i] = component0;
            view[i + 1] = component1;
            view[i + 2] = component2;
            buffer.needsCommit = true;
        };
    },

    // 4 component per attribute
    function(buffer, view, vertexSizeInComponentType) {
        return function(index, component0, component1, component2, component3) {
            var i = index * vertexSizeInComponentType;
            view[i] = component0;
            view[i + 1] = component1;
            view[i + 2] = component2;
            view[i + 3] = component3;
            buffer.needsCommit = true;
        };
    }];

    VertexArrayFacade._appendWriters = function(writers, buffer) {
        var arrayViews = buffer.arrayViews;
        var length = arrayViews.length;
        for ( var i = 0; i < length; ++i) {
            var arrayView = arrayViews[i];
            writers[arrayView.index] = createWriters[arrayView.componentsPerAttribute - 1](buffer, arrayView.view, arrayView.vertexSizeInComponentType);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.commit = function(indexBuffer) {
        var recreateVA = false;
        recreateVA = this._commit(this._static) || recreateVA;
        recreateVA = this._commit(this._stream) || recreateVA;
        recreateVA = this._commit(this._dynamic) || recreateVA;

        ///////////////////////////////////////////////////////////////////////

        if (recreateVA || !this.va) {
            // Using unsigned short indices, 64K vertices can be indexed by one index buffer
            var sixtyFourK = 64 * 1024;

            var va = [];
            var numberOfVertexArrays = Math.ceil(this._size / sixtyFourK);
            for ( var k = 0; k < numberOfVertexArrays; ++k) {
                var attributes = [];
                VertexArrayFacade._appendAttributes(attributes, this._static, k * (this._static.vertexSizeInBytes * sixtyFourK));
                VertexArrayFacade._appendAttributes(attributes, this._stream, k * (this._stream.vertexSizeInBytes * sixtyFourK));
                VertexArrayFacade._appendAttributes(attributes, this._dynamic, k * (this._dynamic.vertexSizeInBytes * sixtyFourK));

                attributes = attributes.concat(this._precreated);

                va.push({
                    va : this._context.createVertexArray(attributes, indexBuffer),
                    indicesCount : 1.5 * ((k !== (numberOfVertexArrays - 1)) ? sixtyFourK : (this._size % sixtyFourK))
                // TODO: not hardcode 1.5
                });
            }

            this._destroyVA();
            this.va = va;
        }
    };

    VertexArrayFacade.prototype._commit = function(buffer) {
        if (buffer.needsCommit && (buffer.vertexSizeInBytes > 0)) {
            buffer.needsCommit = false;

            var vertexBuffer = buffer.vertexBuffer;
            var vertexBufferSizeInBytes = this._size * buffer.vertexSizeInBytes;
            if (!vertexBuffer || (vertexBuffer.getSizeInBytes() < vertexBufferSizeInBytes)) {
                if (vertexBuffer) {
                    vertexBuffer.destroy();
                }
                buffer.vertexBuffer = this._context.createVertexBuffer(buffer.arrayBuffer, buffer.usage);
                buffer.vertexBuffer.setVertexArrayDestroyable(false);

                return true; // Created new vertex buffer
            }

            buffer.vertexBuffer.copyFromArrayView(buffer.arrayBuffer);
        }

        return false; // Did not create new vertex buffer
    };

    VertexArrayFacade._appendAttributes = function(attributes, buffer, vertexBufferOffset) {
        var arrayViews = buffer.arrayViews;
        var length = arrayViews.length;
        for ( var i = 0; i < length; ++i) {
            var view = arrayViews[i];

            attributes.push({
                index : view.index,
                enabled : view.enabled,
                componentsPerAttribute : view.componentsPerAttribute,
                componentDatatype : view.componentDatatype,
                normalize : view.normalize,
                vertexBuffer : buffer.vertexBuffer,
                offsetInBytes : vertexBufferOffset + view.offsetInBytes,
                strideInBytes : buffer.vertexSizeInBytes
            });
        }
    };

    /**
     * DOC_TBA
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.subCommit = function(offsetInVertices, lengthInVertices) {
        if (offsetInVertices < 0 || offsetInVertices >= this._size) {
            throw new DeveloperError('offsetInVertices must be greater than or equal to zero and less than the vertex array size.');
        }

        if (offsetInVertices + lengthInVertices > this._size) {
            throw new DeveloperError('offsetInVertices + lengthInVertices cannot exceed the vertex array size.');
        }

        this._subCommit(this._static, offsetInVertices, lengthInVertices);
        this._subCommit(this._stream, offsetInVertices, lengthInVertices);
        this._subCommit(this._dynamic, offsetInVertices, lengthInVertices);
    };

    VertexArrayFacade.prototype._subCommit = function(buffer, offsetInVertices, lengthInVertices) {
        if (buffer.needsCommit && (buffer.vertexSizeInBytes > 0)) {
            var byteOffset = buffer.vertexSizeInBytes * offsetInVertices;
            var byteLength = buffer.vertexSizeInBytes * lengthInVertices;

            // PERFORMANCE_IDEA: If we want to get really crazy, we could consider updating
            // individual attributes instead of the entire (sub-)vertex.
            //
            // PERFORMANCE_IDEA: Does creating the typed view add too much GC overhead?
            buffer.vertexBuffer.copyFromArrayView(new Uint8Array(buffer.arrayBuffer, byteOffset, byteLength), byteOffset);
        }
    };

    /**
     * DOC_TBA
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.endSubCommits = function() {
        this._static.needsCommit = false;
        this._stream.needsCommit = false;
        this._dynamic.needsCommit = false;
    };

    VertexArrayFacade.prototype._destroyVA = function() {
        var va = this.va;
        if (va) {
            this.va = undefined;

            var length = va.length;
            for ( var i = 0; i < length; ++i) {
                va[i].va.destroy();
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof VertexArrayFacade
     */
    VertexArrayFacade.prototype.destroy = function() {
        this._static.vertexBuffer = this._static.vertexBuffer && this._static.vertexBuffer.destroy();
        this._stream.vertexBuffer = this._stream.vertexBuffer && this._stream.vertexBuffer.destroy();
        this._dynamic.vertexBuffer = this._dynamic.vertexBuffer && this._dynamic.vertexBuffer.destroy();
        this._destroyVA();

        return destroyObject(this);
    };

    return VertexArrayFacade;
});