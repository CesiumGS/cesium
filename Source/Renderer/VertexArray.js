/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/ComponentDatatype'
    ], function(
        DeveloperError,
        destroyObject,
        ComponentDatatype) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias VertexArray
     *
     * @internalConstructor
     *
     * @see {@link Context#createVertexArray}
     * @see {@link Context#createVertexArrayFromMesh}
     */
    var VertexArray = function(gl, attributes, indexBuffer) {
        this._gl = gl;
        this._attributes = [];
        this._indexBuffer = indexBuffer;

        if (attributes) {
            for ( var i = 0; i < attributes.length; ++i) {
                try {
                    this._addAttribute(attributes[i], i);
                } catch (e) {
                    throw new DeveloperError(e.message);
                }
            }
        }

        // Verify all attribute names are unique
        var uniqueIndices = {};
        for ( var j = 0; j < this._attributes.length; ++j) {
            var index = this._attributes[j].index;
            if (uniqueIndices[index]) {
                throw new DeveloperError('Index ' + index + ' is used by more than one attribute.');
            }

            uniqueIndices[index] = true;
        }
    };

    VertexArray.prototype._addAttribute = function(attribute, index) {
        if (!attribute.vertexBuffer && !attribute.value) {
            throw new DeveloperError('attribute must have a vertexBuffer or a value.');
        }

        if (attribute.vertexBuffer && attribute.value) {
            throw new DeveloperError('attribute cannot have both a vertexBuffer and a value.  It must have either a vertexBuffer property defining per-vertex data or a value property defining data for all vertices.');
        }

        var componentsPerAttribute = attribute.value ? attribute.value.length : attribute.componentsPerAttribute;

        if ((componentsPerAttribute !== 1) &&
            (componentsPerAttribute !== 2) &&
            (componentsPerAttribute !== 3) &&
            (componentsPerAttribute !== 4)) {
            if (attribute.value) {
                throw new DeveloperError('attribute.value.length must be in the range [1, 4].');
            }

            throw new DeveloperError('attribute.componentsPerAttribute must be in the range [1, 4].');
        }

        if (attribute.componentDatatype) {
            var datatype = attribute.componentDatatype;
            if (!ComponentDatatype.validate(datatype)) {
                throw new DeveloperError('attribute must have a valid componentDatatype or not specify it.');
            }
        }

        if (attribute.strideInBytes && (attribute.strideInBytes > 255)) {
            // WebGL limit.  Not in GL ES.
            throw new DeveloperError('attribute must have a strideInBytes less than or equal to 255 or not specify it.');
        }

        // Shallow copy the attribute; we do not want to copy the vertex buffer.
        var attr = {
            index : (typeof attribute.index === 'undefined') ? index : attribute.index,
            enabled : (typeof attribute.enabled === 'undefined') ? true : attribute.enabled,
            vertexBuffer : attribute.vertexBuffer,
            value : attribute.value ? attribute.value.slice(0) : undefined,
            componentsPerAttribute : componentsPerAttribute,
            componentDatatype : attribute.componentDatatype || ComponentDatatype.FLOAT,
            normalize : attribute.normalize || false,
            offsetInBytes : attribute.offsetInBytes || 0,
            strideInBytes : attribute.strideInBytes || 0
        };

        if (attr.vertexBuffer) {
            // Common case: vertex buffer for per-vertex data
            attr.vertexAttrib = function(gl) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer._getBuffer());
                gl.vertexAttribPointer(this.index, this.componentsPerAttribute, this.componentDatatype, this.normalize, this.strideInBytes, this.offsetInBytes);
                gl.enableVertexAttribArray(this.index);
            };

            attr.disableVertexAttribArray = function(gl) {
                gl.disableVertexAttribArray(this.index);
            };
        } else {
            // Less common case: value array for the same data for each vertex
            switch (attr.componentsPerAttribute) {
            case 1:
                attr.vertexAttrib = function(gl) {
                    gl.vertexAttrib1fv(this.index, this.value);
                };
                break;
            case 2:
                attr.vertexAttrib = function(gl) {
                    gl.vertexAttrib2fv(this.index, this.value);
                };
                break;
            case 3:
                attr.vertexAttrib = function(gl) {
                    gl.vertexAttrib3fv(this.index, this.value);
                };
                break;
            case 4:
                attr.vertexAttrib = function(gl) {
                    gl.vertexAttrib4fv(this.index, this.value);
                };
                break;
            }

            attr.disableVertexAttribArray = function(gl) {
            };
        }

        this._attributes.push(attr);
    };

    /**
     * DOC_TBA
     *
     * index is the location in the array of attributes, not the index property of an attribute.
     *
     * @memberof VertexArray
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     */
    VertexArray.prototype.getAttribute = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        return this._attributes[index];
    };

    /**
    * DOC_TBA
    *
    * @memberof VertexArray
    *
    * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
    */
    VertexArray.prototype.getNumberOfAttributes = function() {
        return this._attributes.length;
    };

    /**
     * DOC_TBA
     *
     * @memberof VertexArray
     *
     * @exception {DeveloperError} Attribute must have a vertexBuffer.
     * @exception {DeveloperError} Attribute must have a componentsPerAttribute.
     * @exception {DeveloperError} Attribute must have a valid componentDatatype or not specify it.
     * @exception {DeveloperError} Attribute must have a strideInBytes less than or equal to 255 or not specify it.
     * @exception {DeveloperError} Index is already in use.
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     */
    VertexArray.prototype.addAttribute = function(attribute) {
        if (attribute) {
            var attributes = this._attributes;
            var index = (typeof attribute.index === 'undefined') ? attributes.length : attribute.index;
            for ( var i = 0; i < attributes.length; ++i) {
                if (index === attributes[i].index) {
                    throw new DeveloperError('Index ' + index + ' is already in use.');
                }
            }

            try {
                this._addAttribute(attribute, index);
            } catch (e) {
                throw new DeveloperError(e.message);
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof VertexArray
     *
     * @return {Boolean} True if the attribute was removed; false if the attribute was not found in the vertex array.
     *
     * @exception {DeveloperError} Attribute must have an index.
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     */
    VertexArray.prototype.removeAttribute = function(attribute) {
        if (attribute) {
            if (typeof attribute.index === 'undefined') {
                throw new DeveloperError('Attribute must have an index.');
            }

            var attributes = this._attributes;
            for ( var i = 0; i < attributes.length; ++i) {
                if (attributes[i].index === attribute.index) {
                    attributes.splice(i, 1);
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof VertexArray
     *
     * @return {Buffer} DOC_TBA.
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     */
    VertexArray.prototype.getIndexBuffer = function() {
        return this._indexBuffer;
    };

    /**
     * DOC_TBA
     *
     * @memberof VertexArray
     *
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     */
    VertexArray.prototype.setIndexBuffer = function(indexBuffer) {
        this._indexBuffer = indexBuffer;
    };

    VertexArray.prototype._bind = function() {
        var attributes = this._attributes;
        var gl = this._gl;

        // TODO:  Performance: sort by vertex buffer?
        for ( var i = 0; i < attributes.length; ++i) {
            var attribute = attributes[i];
            if (attribute.enabled) {
                attribute.vertexAttrib(gl);
            }
        }

        if (this._indexBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer._getBuffer());
        }
    };

    VertexArray.prototype._unBind = function() {
        var attributes = this._attributes;
        var gl = this._gl;

        for ( var i = 0; i < attributes.length; ++i) {
            var attribute = attributes[i];
            if (attribute.enabled) {
                attribute.disableVertexAttribArray(gl);
            }
        }
        if (this._indexBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }
    };

    /**
     * This assumes that each vertex buffer in the vertex array has the same number of vertices.
     * @private
     */
    VertexArray.prototype._getNumberOfVertices = function() {
        if (this._attributes.length > 0) {
            var attribute = this._attributes[0];
            var bytes = attribute.strideInBytes || (attribute.componentsPerAttribute * attribute.componentDatatype.sizeInBytes);

            return attribute.vertexBuffer.getSizeInBytes() / bytes;
        }

        return 0;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof VertexArray
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see VertexArray#destroy
     */
    VertexArray.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Only call this if the vertex array owns the vertex buffers referenced by the attributes and owns its
     * index buffer; otherwise, the owner of the buffers is responsible for destroying them.  A vertex or
     * index buffer is only destroyed if it's <code>getVertexArrayDestroyable</code> function returns
     * <code>true</code> (the default).  This allows combining destroyable and non-destroyable buffers
     * in the same vertex array.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof VertexArray
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This vertex array was destroyed, i.e., destroy() was called.
     *
     * @see VertexArray#isDestroyed
     * @see Buffer#getVertexArrayDestroyable
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteBuffers.xml'>glDeleteBuffers</a>
     *
     * @example
     * // Destroying the vertex array implicitly calls destroy for each of its vertex
     * // buffers and its index buffer.
     * var vertexBuffer = context.createVertexBuffer(new Float32Array([0, 0, 0]),
     *     BufferUsage.STATIC_DRAW);
     * var vertexArray = context.createVertexArray();
     * vertexArray.addAttribute({ vertexBuffer : vertexBuffer, componentsPerAttribute : 3 });
     * // ...
     * vertexArray = vertexArray.destroy();
     * // Calling vertexBuffer.destroy() would throw DeveloperError at this point.
     */
    VertexArray.prototype.destroy = function() {
        var attributes = this._attributes;
        for ( var i = 0; i < attributes.length; ++i) {
            var vertexBuffer = attributes[i].vertexBuffer;
            if (vertexBuffer && !vertexBuffer.isDestroyed() && vertexBuffer.getVertexArrayDestroyable()) {
                vertexBuffer.destroy();
            }
        }

        var indexBuffer = this._indexBuffer;
        if (indexBuffer && !indexBuffer.isDestroyed() && indexBuffer.getVertexArrayDestroyable()) {
            indexBuffer.destroy();
        }

        return destroyObject(this);
    };

    return VertexArray;
});