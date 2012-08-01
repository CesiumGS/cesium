/*global define*/
define([
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/PolylinePipeline',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/StencilFunction',
        '../Renderer/StencilOperation',
        './SceneMode',
        '../Shaders/PolylineVS',
        '../Shaders/PolylineFS'
    ], function(
        combine,
        destroyObject,
        Cartesian3,
        Cartesian4,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        PolylinePipeline,
        BufferUsage,
        BlendingState,
        StencilFunction,
        StencilOperation,
        SceneMode,
        PolylineVS,
        PolylineFS) {
    "use strict";

    var attributeIndices = {
        position2D : 0,
        position3D : 1
    };

    function PositionVertices() {
        this._va = undefined;
        this._primitiveType = undefined;
    }

    PositionVertices.prototype.getVertexArray = function() {
        return this._va;
    };

    PositionVertices.prototype.getPrimitiveType = function() {
        return this._primitiveType;
    };

    PositionVertices.prototype.update3D = function(context, positions, bufferUsage) {
        var length = positions.length;
        var positionArray = new Float32Array(length * 3);

        var j = 0;
        for ( var i = 0; i < length; ++i) {
            var p = positions[i];

            positionArray[j + 0] = p.x;
            positionArray[j + 1] = p.y;
            positionArray[j + 2] = p.z;

            j += 3;
        }

        var attributes = [{
            index : attributeIndices.position3D,
            vertexBuffer : context.createVertexBuffer(positionArray, bufferUsage),
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }, {
            index : attributeIndices.position2D,
            value : [0.0, 0.0]
        }];

        this._va = context.createVertexArray(attributes);
        this._primitiveType = PrimitiveType.LINE_STRIP;
    };

    PositionVertices.prototype.update2D = function(context, positions, bufferUsage, projection) {
        var segments = PolylinePipeline.wrapLongitude(projection.getEllipsoid(), positions);

        var i = 0;
        var numberOfSegments = segments.length;
        var numberOfPositions = 0;
        for (i = 0; i < numberOfSegments; ++i) {
            var segmentLength = segments[i].length;
            numberOfPositions += ((i === 0) || (segmentLength === 2)) ? segmentLength : segmentLength - 1;
        }

        var positionArray = new Float32Array(numberOfPositions * 3);
        var indices = new Uint16Array((numberOfPositions - 1) * 2);

        var j = 0;
        var k = 0;
        var m = 0;
        for (i = 0; i < numberOfSegments; ++i) {
            var segment = segments[i];
            // Do not duplicate first point of this segment with last point of previous segment
            var startN = ((i === 0) || (segment.length === 2)) ? 0 : 1;
            for ( var n = startN; n < segment.length; ++n) {
                var p = projection.project(segment[n].cartographic);

                positionArray[j + 0] = p.x;
                positionArray[j + 1] = p.y;
                positionArray[j + 2] = p.z;

                if (n !== segment.length - 1) {
                    indices[m + 0] = k;
                    indices[m + 1] = k + 1;
                    m += 2;
                }

                j += 3;
                ++k;
            }
        }

        var attributes = [{
            index : attributeIndices.position2D,
            vertexBuffer : context.createVertexBuffer(positionArray, bufferUsage),
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }, {
            index : attributeIndices.position3D,
            value : [0.0, 0.0, 0.0]
        }];

        // TODO: Handle overflow unsigned short

        var va = context.createVertexArray(attributes);
        va.setIndexBuffer(context.createIndexBuffer(indices, bufferUsage, IndexDatatype.UNSIGNED_SHORT));

        this._va = va;
        this._primitiveType = PrimitiveType.LINES;
    };

    PositionVertices.prototype.updateMorphing = function(context, positions2D, positions3D, bufferUsage, projection) {
        var segments = PolylinePipeline.wrapLongitude(projection.getEllipsoid(), positions2D);

        var i = 0;
        var numberOfSegments = segments.length;
        var numberOfPositions = 0;
        for (i = 0; i < numberOfSegments; ++i) {
            var segmentLength = segments[i].length;
            numberOfPositions += ((i === 0) || (segmentLength === 2)) ? segmentLength : segmentLength - 1;
        }

        var positionArray = new Float32Array(numberOfPositions * 3);
        var wgs84PositionArray = new Float32Array(numberOfPositions * 3); // TODO: Interleave with facade

        var indices = new Uint16Array((numberOfPositions - 1) * 2);

        var j = 0;
        var k = 0;
        var m = 0;
        for (i = 0; i < numberOfSegments; ++i) {
            var segment = segments[i];
            // Do not duplicate first point of this segment with last point of previous segment
            var startN = ((i === 0) || (segment.length === 2)) ? 0 : 1;
            for ( var n = startN; n < segment.length; ++n) {
                var p = projection.project(segment[n].cartographic);

                positionArray[j + 0] = p.x;
                positionArray[j + 1] = p.y;
                positionArray[j + 2] = p.z;

                //wgs84PositionArray[j + 0] = segment[n].cartesian.x;
                //wgs84PositionArray[j + 1] = segment[n].cartesian.y;
                //wgs84PositionArray[j + 2] = segment[n].cartesian.z;
                wgs84PositionArray[j + 0] = positions3D[segment[n].index].x;
                wgs84PositionArray[j + 1] = positions3D[segment[n].index].y;
                wgs84PositionArray[j + 2] = positions3D[segment[n].index].z;

                if (n !== segment.length - 1) {
                    indices[m + 0] = k;
                    indices[m + 1] = k + 1;
                    m += 2;
                }

                j += 3;
                ++k;
            }
        }

        var attributes = [{
            index : attributeIndices.position2D,
            vertexBuffer : context.createVertexBuffer(positionArray, bufferUsage),
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }, {
            index : attributeIndices.position3D,
            vertexBuffer : context.createVertexBuffer(wgs84PositionArray, bufferUsage),
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }];

        // TODO: Handle overflow unsigned short

        var va = context.createVertexArray(attributes);
        va.setIndexBuffer(context.createIndexBuffer(indices, bufferUsage, IndexDatatype.UNSIGNED_SHORT));

        this._va = va;
        this._primitiveType = PrimitiveType.LINES;
    };

    PositionVertices.prototype.update = function(context, positions2D, positions3D, bufferUsage, mode, projection) {
        if (positions2D && positions3D) {
            var length = Math.min(positions2D.length, positions3D.length); // TODO: Depends on view

            // Initially create or recreate vertex array and buffers
            this._va = this._va && this._va.destroy();

            if (length > 0) {
                switch (mode) {
                case SceneMode.SCENE3D:
                    this.update3D(context, positions3D, bufferUsage);
                    break;

                case SceneMode.SCENE2D:
                case SceneMode.COLUMBUS_VIEW:
                    this.update2D(context, positions2D, bufferUsage, projection);
                    break;

                case SceneMode.MORPHING:
                    this.updateMorphing(context, positions2D, positions3D, bufferUsage, projection);
                    break;
                }
            }
        } else {
            this._va = this._va && this._va.destroy();
        }
    };

    PositionVertices.prototype.isDestroyed = function() {
        return false;
    };

    PositionVertices.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        return destroyObject(this);
    };

    /**
     * DOC_TBA
     *
     * @alias Polyline
     * @constructor
     *
     * @example
     * var polyline = new Polyline();
     * polyline.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 0.5
     * };
     * polyline.outlineColor = {
     *   red   : 1.0,
     *   green : 1.0,
     *   blue  : 0.0,
     *   alpha : 0.5
     * };
     * polyline.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ]);
     */
    var Polyline = function() {
        this._sp = undefined;
        this._spGroundTrack = undefined;
        this._spHeightTrack = undefined;
        this._rsOne = undefined;
        this._rsTwo = undefined;
        this._rsThree = undefined;
        this._rsPick = undefined;

        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = this._mode.morphTime;

        var that = this;

        var drawUniformsOne = {
            u_color : function() {
                return that.color; // does not matter; does not write color
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };
        var drawUniformsTwo = {
            u_color : function() {
                return that.color;
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };
        var drawUniformsThree = {
            u_color : function() {
                return that.outlineColor;
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };
        var pickUniforms = {
            u_color : function() {
                return that._pickId.normalizedRgba;
            },
            u_morphTime : function() {
                return that.morphTime;
            }
        };

        this._drawUniformsOne3D = combine(drawUniformsOne, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });
        this._drawUniformsTwo3D = combine(drawUniformsTwo, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });
        this._drawUniformsThree3D = combine(drawUniformsThree, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });
        this._pickUniforms3D = combine(pickUniforms, {
            u_model : function() {
                return that._getModelMatrix(that._mode);
            }
        });

        this._drawUniformsOne2D = combine(drawUniformsOne, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._drawUniformsTwo2D = combine(drawUniformsTwo, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._drawUniformsThree2D = combine(drawUniformsThree, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });
        this._pickUniforms2D = combine(pickUniforms, {
            u_model : function() {
                return Matrix4.IDENTITY;
            }
        });

        this._drawUniformsOne = undefined;
        this._drawUniformsTwo = undefined;
        this._drawUniformsThree = undefined;
        this._pickUniforms = undefined;

        this._positions = undefined;
        this._createVertexArray = false;

        this._vertices = new PositionVertices();
        this._pickId = undefined;

        /**
         * DOC_TBA
         * <br /><br />
         * The actual width used is clamped to the minimum and maximum width supported by the WebGL implementation.
         * These can be queried with {@link Context#getMinimumAliasedLineWidth} and
         * {@link Context#getMaximumAliasedLineWidth}.
         *
         * @type Number
         *
         * @see Polyline#outlineWidth
         * @see Context#getMinimumAliasedLineWidth
         * @see Context#getMaximumAliasedLineWidth
         *
         * @example
         * // 3 pixel total width, 1 pixel interior width
         * polyline.width = 1.0;
         * polyline.outlineWidth = 3.0;
         */
        this.width = 2;

        /**
         * DOC_TBA
         * <br /><br />
         * The actual width used is clamped to the minimum and maximum width supported by the WebGL implementation.
         * These can be queried with {@link Context#getMinimumAliasedLineWidth} and
         * {@link Context#getMaximumAliasedLineWidth}.
         *
         * @type Number
         *
         * @see Polyline#width
         * @see Context#getMinimumAliasedLineWidth
         * @see Context#getMaximumAliasedLineWidth
         *
         * @example
         * // 3 pixel total width, 1 pixel interior width
         * polyline.width = 1.0;
         * polyline.outlineWidth = 3.0;
         */
        this.outlineWidth = 5;

        /**
         * DOC_TBA
         *
         * @see Polyline#outlineColor
         */
        this.color = {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 1.0
        };

        /**
         * DOC_TBA
         *
         * @see Polyline#color
         */
        this.outlineColor = {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 1.0
        };

        /**
         * Determines if this polyline will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * Sets the 4x4 transformation matrix that transforms this polyline's positions from model to world coordinates.
         * When this is the identity matrix, the polyline is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link agi_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see agi_model
         *
         * @example
         * // The arrow points to the east, i.e., along the local x-axis.
         * var polyline = new Polyline();
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * polyline.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         * polyline.setPositions([
         *   new Cartesian3(0.0, 0.0, 0.0),
         *   new Cartesian3(1000000.0, 0.0, 0.0),
         *   new Cartesian3(900000.0, -100000.0, 0.0),
         *   new Cartesian3(900000.0, 100000.0, 0.0),
         *   new Cartesian3(1000000.0, 0.0, 0.0)
         * ]);
         */
        this.modelMatrix = Matrix4.IDENTITY;
        this._modelMatrix = Matrix4.IDENTITY;

        /**
         * The usage hint for the polyline's vertex buffer.
         *
         * @type BufferUsage
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link Polyline#update} is called, the polyline's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the polyline
         * will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If the polyline will change every frame, use <code>BufferUsage.STREAM_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
        this._bufferUsage = undefined;

        /**
         * DOC_TBA
         */
        this.columbusView = {
            /**
             * DOC_TBA
             */
            track : {
                /**
                 * DOC_TBA
                 */
                show : true
            },

            /**
             * DOC_TBA
             */
            groundTrack : {
                /**
                 * DOC_TBA
                 */
                show : false
            },

            /**
             * DOC_TBA
             */
            heightTrack : {
                /**
                 * DOC_TBA
                 */
                show : false
            }
        };

        /**
         * DOC_TODO
         */
        this.scene3D = {
            /**
             * DOC_TODO
             */
            modelMatrix : undefined,

            /**
             * DOC_TODO
             */
            setPositions : function(value) {
                this._positions = value;
                that._createVertexArray = true;
            },

            /**
             * DOC_TODO
             */
            getPositions : function() {
                return this._positions;
            },

            _positions : undefined
        };

        /**
         * DOC_TODO
         */
        this.scene2D = {
            /**
             * DOC_TODO
             */
            modelMatrix : undefined,

            /**
             * DOC_TODO
             */
            setPositions : function(value) {
                this._positions = value;
                that._createVertexArray = true;
            },

            /**
             * DOC_TODO
             */
            getPositions : function() {
                return this._positions;
            },

            _positions : undefined
        };
    };

    Polyline.prototype._getModelMatrix = function(mode) {
        switch (mode) {
        case SceneMode.SCENE3D:
            return this.scene3D.modelMatrix || this.modelMatrix;

        case SceneMode.SCENE2D:
        case SceneMode.COLUMBUS_VIEW:
            return this.scene2D.modelMatrix || this.modelMatrix;

        case SceneMode.MORPHING:
            return Matrix4.IDENTITY;
        }
    };

    Polyline.prototype._getPositions3D = function() {
        return this.scene3D._positions || this._positions;
    };

    Polyline.prototype._getPositions2D = function() {
        return this.scene2D._positions || this._positions;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#setPositions
     */
    Polyline.prototype.getPositions = function() {
        return this._positions;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#getPositions
     *
     * @example
     * polyline.setPositions([
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...)),
     *   ellipsoid.cartographicToCartesian(new Cartographic(...))
     * ]);
     */
    Polyline.prototype.setPositions = function(value) {
        this._positions = value;
        this._createVertexArray = true;
    };

    Polyline.prototype._clampWidth = function(context, value) {
        var min = context.getMinimumAliasedLineWidth();
        var max = context.getMaximumAliasedLineWidth();

        return Math.min(Math.max(value, min), max);
    };

    Polyline.prototype._isShown = function() {
        return this.show && (this.color.alpha !== 0);
    };

    /**
     * Commits changes to properties before rendering by updating the object's WebGL resources.
     * This must be called before calling {@link Polyline#render} in order to realize
     * changes to polyline's positions and properties.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#render
     */
    Polyline.prototype.update = function(context, sceneState) {
        if (this._isShown()) {
            if (!this._sp) {
                this._sp = context.getShaderCache().getShaderProgram(PolylineVS, PolylineFS, attributeIndices);

                this._rsOne = context.createRenderState({
                    colorMask : {
                        red : false,
                        green : false,
                        blue : false,
                        alpha : false
                    },
                    lineWidth : 1,
                    blending : BlendingState.ALPHA_BLEND,
                    stencilTest : {
                        enabled : true,
                        frontFunction : StencilFunction.ALWAYS,
                        backFunction : StencilFunction.ALWAYS,
                        reference : 0,
                        mask : ~0,
                        frontOperation : {
                            fail : StencilOperation.REPLACE,
                            zFail : StencilOperation.REPLACE,
                            zPass : StencilOperation.REPLACE
                        },
                        backOperation : {
                            fail : StencilOperation.REPLACE,
                            zFail : StencilOperation.REPLACE,
                            zPass : StencilOperation.REPLACE
                        }
                    }
                });

                this._rsTwo = context.createRenderState({
                    lineWidth : 1,
                    depthMask : false,
                    blending : BlendingState.ALPHA_BLEND,
                    stencilTest : {
                        enabled : true,
                        frontFunction : StencilFunction.ALWAYS,
                        backFunction : StencilFunction.ALWAYS,
                        reference : 1,
                        mask : ~0,
                        frontOperation : {
                            fail : StencilOperation.KEEP,
                            zFail : StencilOperation.KEEP,
                            zPass : StencilOperation.REPLACE
                        },
                        backOperation : {
                            fail : StencilOperation.KEEP,
                            zFail : StencilOperation.KEEP,
                            zPass : StencilOperation.REPLACE
                        }
                    }
                });

                this._rsThree = context.createRenderState({
                    lineWidth : 1,
                    depthMask : false,
                    blending : BlendingState.ALPHA_BLEND,
                    stencilTest : {
                        enabled : true,
                        frontFunction : StencilFunction.NOT_EQUAL,
                        backFunction : StencilFunction.NOT_EQUAL,
                        reference : 1,
                        mask : ~0,
                        frontOperation : {
                            fail : StencilOperation.KEEP,
                            zFail : StencilOperation.KEEP,
                            zPass : StencilOperation.KEEP
                        },
                        backOperation : {
                            fail : StencilOperation.KEEP,
                            zFail : StencilOperation.KEEP,
                            zPass : StencilOperation.KEEP
                        }
                    }
                });
            }

            var mode = sceneState.mode;
            var projection = sceneState.scene2D.projection;

            if (this._mode !== mode && typeof mode.morphTime !== 'undefined') {
                this.morphTime = mode.morphTime;
            }

            if (this.columbusView.groundTrack.show || (mode === SceneMode.SCENE2D)) {
                this._spGroundTrack =
                    this._spGroundTrack ||
                    context.getShaderCache().getShaderProgram(
                            '#define GROUND_TRACK\n' +
                            '#line 0\n' +
                            PolylineVS, PolylineFS, attributeIndices);
            } else {
                this._spGroundTrack = this._spGroundTrack && this._spGroundTrack.release();
            }

            if (this.columbusView.heightTrack.show) {
                this._spHeightTrack =
                    this._spHeightTrack ||
                    context.getShaderCache().getShaderProgram(
                            '#define HEIGHT_TRACK\n' +
                            '#line 0\n' +
                            PolylineVS, PolylineFS, attributeIndices);
            } else {
                this._spHeightTrack = this._spHeightTrack && this._spHeightTrack.release();
            }

            // Update render state if line width or depth test changed.
            var width = this._clampWidth(context, this.width);
            var outlineWidth = this._clampWidth(context, this.outlineWidth);

            // Enable depth testing during and after a morph.
            var useDepthTest = (this.morphTime !== 0.0);

            var rsOne = this._rsOne;
            rsOne.lineWidth = outlineWidth;
            rsOne.depthMask = !useDepthTest;
            rsOne.depthTest.enabled = useDepthTest;

            var rsTwo = this._rsTwo;
            rsTwo.lineWidth = width;
            rsTwo.depthTest.enabled = useDepthTest;

            var rsThree = this._rsThree;
            rsThree.lineWidth = outlineWidth;
            rsThree.depthTest.enabled = useDepthTest;

            var modelMatrix = this._getModelMatrix(mode);

            if (this._createVertexArray ||
                (this._bufferUsage !== this.bufferUsage) ||
                (this._mode !== mode) ||
                (this._projection !== projection) ||
                (mode !== SceneMode.SCENE3D) &&
                (!this._modelMatrix.equals(modelMatrix))) {
                this._createVertexArray = false;
                this._bufferUsage = this.bufferUsage;
                this._mode = mode;
                this._projection = projection;
                this._modelMatrix = modelMatrix.clone();

                var positions2D = this._getPositions2D();
                var positions3D = this._getPositions3D();

                if (mode === SceneMode.SCENE3D) {
                    this._drawUniformsOne = this._drawUniformsOne3D;
                    this._drawUniformsTwo = this._drawUniformsTwo3D;
                    this._drawUniformsThree = this._drawUniformsThree3D;
                    this._pickUniforms = this._pickUniforms3D;

                    this._vertices.update(context, positions2D, positions3D, this.bufferUsage, mode, projection);
                } else {
                    this._drawUniformsOne = this._drawUniformsOne2D;
                    this._drawUniformsTwo = this._drawUniformsTwo2D;
                    this._drawUniformsThree = this._drawUniformsThree2D;
                    this._pickUniforms = this._pickUniforms2D;

                    // TODO: This is slow and needs work.

                    // PERFORMANCE_IDEA: When the model matrix changes often, e.g., orbits that transform from CBI to CBF,
                    // we can consider moving this transform and the map projection into the vertex shader.  However,
                    // clipping will make it nontrivial.
                    var mv2D = this.scene2D.modelMatrix || this.modelMatrix;
                    var worldPositions2D = [];
                    var i, p;
                    if (typeof positions2D !== 'undefined') {
                        for (i = 0; i < positions2D.length; ++i) {
                            p = mv2D.multiplyByVector(new Cartesian4(positions2D[i].x, positions2D[i].y, positions2D[i].z, 1.0));
                            worldPositions2D.push(new Cartesian3(p.x, p.y, p.z));
                        }
                    }

                    var mv3D = this.scene3D.modelMatrix || this.modelMatrix;
                    var worldPositions3D = [];
                    if (typeof positions3D !== 'undefined') {
                        for (i = 0; i < positions3D.length; ++i) {
                            p = mv3D.multiplyByVector(new Cartesian4(positions3D[i].x, positions3D[i].y, positions3D[i].z, 1.0));
                            worldPositions3D.push(new Cartesian3(p.x, p.y, p.z));
                        }
                    }

                    this._vertices.update(context, worldPositions2D, worldPositions3D, this.bufferUsage, mode, projection);
                }
            }
        }
    };

    Polyline.prototype._render = function(context, sp) {
        var va = this._vertices.getVertexArray();
        var primitiveType = this._vertices.getPrimitiveType();

        context.draw({
            primitiveType : primitiveType,
            shaderProgram : sp,
            uniformMap : this._drawUniformsOne,
            vertexArray : va,
            renderState : this._rsOne
        });
        context.draw({
            primitiveType : primitiveType,
            shaderProgram : sp,
            uniformMap : this._drawUniformsTwo,
            vertexArray : va,
            renderState : this._rsTwo
        });
        context.draw({
            primitiveType : primitiveType,
            shaderProgram : sp,
            uniformMap : this._drawUniformsThree,
            vertexArray : va,
            renderState : this._rsThree
        });
    };

    /**
     * Renders the Polyline.  In order for changes to positions and properties to be realized,
     * {@link Polyline#update} must be called before <code>render</code>.
     * <br /><br />
     * Outlined polylines are rendered in three passes using the stencil buffer.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#update
     */
    Polyline.prototype.render = function(context) {
        var va = this._vertices.getVertexArray();

        if (this._isShown() && va) {
            if (this._mode === SceneMode.SCENE2D) {
                this._render(context, this._spGroundTrack);
            } else if ((this._mode === SceneMode.COLUMBUS_VIEW) || (this._mode === SceneMode.MORPHING)) {
                if (this.columbusView.track.show) {
                    this._render(context, this._sp);
                }

                if (this.columbusView.groundTrack.show) {
                    this._render(context, this._spGroundTrack);
                }

                if (this.columbusView.heightTrack.show) {
                    this._render(context, this._spHeightTrack);
                }
            } else {
                // PERFORMANCE_IDEA:  This can do this in a single pass by checking the distance
                // from a fragment to the line in a fragment shader.
                this._render(context, this._sp);
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polyline.prototype.updateForPick = function(context) {
        if (this._isShown()) {
            this._pickId = this._pickId || context.createPickId(this);
            this._rsPick = this._rsPick || context.createRenderState();

            var outlineWidth = this._clampWidth(context, this.outlineWidth);
            // Enable depth testing during and after a morph.
            var useDepthTest = (this.morphTime !== 0.0);

            var rs = this._rsPick;
            rs.lineWidth = outlineWidth;
            rs.depthTest.enabled = useDepthTest;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    Polyline.prototype.renderForPick = function(context, framebuffer) {
        var va = this._vertices.getVertexArray();

        // TODO:  Pick on ground track and height track

        if (this._isShown() && va) {
            context.draw({
                primitiveType : this._vertices.getPrimitiveType(),
                shaderProgram : this._sp,
                uniformMap : this._pickUniforms,
                vertexArray : va,
                renderState : this._rsPick,
                framebuffer : framebuffer
            });
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Polyline
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Polyline#destroy
     */
    Polyline.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Polyline
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#isDestroyed
     *
     * @example
     * polyline = polyline && polyline.destroy();
     */
    Polyline.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._spGroundTrack = this._spGroundTrack && this._spGroundTrack.release();
        this._spHeightTrack = this._spHeightTrack && this._spHeightTrack.release();
        this._vertices = this._vertices.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return Polyline;
});