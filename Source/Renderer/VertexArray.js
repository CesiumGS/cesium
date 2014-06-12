/*global define*/
define([
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError'
    ], function(
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError) {
    "use strict";

    function addAttribute(attributes, attribute, index) {
        var hasVertexBuffer = defined(attribute.vertexBuffer);
        var hasValue = defined(attribute.value);
        var componentsPerAttribute = attribute.value ? attribute.value.length : attribute.componentsPerAttribute;

        //>>includeStart('debug', pragmas.debug);
        if (!hasVertexBuffer && !hasValue) {
            throw new DeveloperError('attribute must have a vertexBuffer or a value.');
        }
        if (hasVertexBuffer && hasValue) {
            throw new DeveloperError('attribute cannot have both a vertexBuffer and a value.  It must have either a vertexBuffer property defining per-vertex data or a value property defining data for all vertices.');
        }
        if ((componentsPerAttribute !== 1) &&
            (componentsPerAttribute !== 2) &&
            (componentsPerAttribute !== 3) &&
            (componentsPerAttribute !== 4)) {
            if (hasValue) {
                throw new DeveloperError('attribute.value.length must be in the range [1, 4].');
            }

            throw new DeveloperError('attribute.componentsPerAttribute must be in the range [1, 4].');
        }
        if (defined(attribute.componentDatatype) && !ComponentDatatype.validate(attribute.componentDatatype)) {
            throw new DeveloperError('attribute must have a valid componentDatatype or not specify it.');
        }
        if (defined(attribute.strideInBytes) && (attribute.strideInBytes > 255)) {
            // WebGL limit.  Not in GL ES.
            throw new DeveloperError('attribute must have a strideInBytes less than or equal to 255 or not specify it.');
        }
        //>>includeEnd('debug');

        // Shallow copy the attribute; we do not want to copy the vertex buffer.
        var attr = {
            index : defaultValue(attribute.index, index),
            enabled : defaultValue(attribute.enabled, true),
            vertexBuffer : attribute.vertexBuffer,
            value : hasValue ? attribute.value.slice(0) : undefined,
            componentsPerAttribute : componentsPerAttribute,
            componentDatatype : defaultValue(attribute.componentDatatype, ComponentDatatype.FLOAT),
            normalize : defaultValue(attribute.normalize, false),
            offsetInBytes : defaultValue(attribute.offsetInBytes, 0),
            strideInBytes : defaultValue(attribute.strideInBytes, 0)
        };

        if (hasVertexBuffer) {
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

        attributes.push(attr);
    }

    function bind(gl, attributes, indexBuffer) {
        for ( var i = 0; i < attributes.length; ++i) {
            var attribute = attributes[i];
            if (attribute.enabled) {
                attribute.vertexAttrib(gl);
            }
        }

        if (defined(indexBuffer)) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer._getBuffer());
        }
    }

    /**
     * @private
     */
    var VertexArray = function(gl, vertexArrayObject, attributes, indexBuffer) {
        //>>includeStart('debug', pragmas.debug
        if (!defined(attributes)) {
            throw new DeveloperError('attributes is required.');
        }
        //>>includeEnd('debug');

        var i;
        var vaAttributes = [];
        var numberOfVertices = 1;   // if every attribute is backed by a single value

        for (i = 0; i < attributes.length; ++i) {
            addAttribute(vaAttributes, attributes[i], i);
        }

        for (i = 0; i < vaAttributes.length; ++i) {
            var attribute = vaAttributes[i];

            if (defined(attribute.vertexBuffer)) {
                // This assumes that each vertex buffer in the vertex array has the same number of vertices.
                var bytes = attribute.strideInBytes || (attribute.componentsPerAttribute * ComponentDatatype.getSizeInBytes(attribute.componentDatatype));
                numberOfVertices = attribute.vertexBuffer.sizeInBytes / bytes;
                break;
            }
        }

        // Verify all attribute names are unique
        var uniqueIndices = {};
        for ( var j = 0; j < vaAttributes.length; ++j) {
            var index = vaAttributes[j].index;
            if (uniqueIndices[index]) {
                throw new DeveloperError('Index ' + index + ' is used by more than one attribute.');
            }

            uniqueIndices[index] = true;
        }

        var vao;

        // Setup VAO if extension is supported
        if (defined(vertexArrayObject)) {
            vao = vertexArrayObject.createVertexArrayOES();
            vertexArrayObject.bindVertexArrayOES(vao);
            bind(gl, vaAttributes, indexBuffer);
            vertexArrayObject.bindVertexArrayOES(null);
        }

        this._numberOfVertices = numberOfVertices;
        this._gl = gl;
        this._vaoExtension = vertexArrayObject;
        this._vao = vao;
        this._attributes = vaAttributes;
        this._indexBuffer = indexBuffer;
    };

    defineProperties(VertexArray.prototype, {
        numberOfAttributes : {
            get : function() {
                return this._attributes.length;
            }
        },
        numberOfVertices : {
            get : function() {
                return this._numberOfVertices;
            }
        },
        indexBuffer : {
            get : function() {
                return this._indexBuffer;
            }
        }
    });

    /**
     * index is the location in the array of attributes, not the index property of an attribute.
     */
    VertexArray.prototype.getAttribute = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._attributes[index];
    };

    VertexArray.prototype._bind = function() {
        if (defined(this._vao)) {
            this._vaoExtension.bindVertexArrayOES(this._vao);
        } else {
            bind(this._gl, this._attributes, this._indexBuffer);
        }
    };

    VertexArray.prototype._unBind = function() {
        if (defined(this._vao)) {
            this._vaoExtension.bindVertexArrayOES(null);
        } else {
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
        }
    };

    VertexArray.prototype.isDestroyed = function() {
        return false;
    };

    VertexArray.prototype.destroy = function() {
        var attributes = this._attributes;
        for ( var i = 0; i < attributes.length; ++i) {
            var vertexBuffer = attributes[i].vertexBuffer;
            if (defined(vertexBuffer) && !vertexBuffer.isDestroyed() && vertexBuffer.vertexArrayDestroyable) {
                vertexBuffer.destroy();
            }
        }

        var indexBuffer = this._indexBuffer;
        if (defined(indexBuffer) && !indexBuffer.isDestroyed() && indexBuffer.vertexArrayDestroyable) {
            indexBuffer.destroy();
        }

        if (defined(this._vao)) {
            this._vaoExtension.deleteVertexArrayOES(this._vao);
        }

        return destroyObject(this);
    };

    return VertexArray;
});