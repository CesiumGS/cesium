/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/FAR',
        '../Core/Math',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/BlendEquation',
        '../Renderer/BlendFunction',
        './ColorMaterial',
        '../Shaders/Noise',
        '../Shaders/SensorVolume',
        '../Shaders/CustomSensorVolumeVS',
        '../Shaders/CustomSensorVolumeFS',
        './SceneMode'
    ], function(
        DeveloperError,
        Color,
        combine,
        destroyObject,
        FAR,
        CesiumMath,
        Cartesian3,
        Matrix4,
        ComponentDatatype,
        PrimitiveType,
        BufferUsage,
        BlendEquation,
        BlendFunction,
        ColorMaterial,
        ShadersNoise,
        ShadersSensorVolume,
        CustomSensorVolumeVS,
        CustomSensorVolumeFS,
        SceneMode) {
    "use strict";

    var attributeIndices = {
        position : 0,
        normal : 1
    };

    /**
     * DOC_TBA
     *
     * @alias CustomSensorVolume
     * @constructor
     *
     * @see SensorVolumeCollection#addCustom
     */
    var CustomSensorVolume = function(template) {
        var t = template || {};

        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;

        this._spPick = undefined;
        this._pickId = undefined;
        this._pickIdThis = t._pickIdThis || this;

        /**
         * <code>true</code> if this sensor will be shown; otherwise, <code>false</code>
         *
         * @type Boolean
         */
        this.show = (typeof t.show === 'undefined') ? true : t.show;

        /**
         * DOC_TBA
         *
         * @type Boolean
         */
        this.showIntersection = (typeof t.showIntersection === 'undefined') ? true : t.showIntersection;

        /**
         * <p>
         * Determines if a sensor intersecting the ellipsoid is drawn through the ellipsoid and potentially out
         * to the other side, or if the part of the sensor intersecting the ellipsoid stops at the ellipsoid.
         * </p>
         * <p>
         * The default is <code>false</code>, meaning the sensor will not go through the ellipsoid.
         * </p>
         *
         * @type Boolean
         */
        this.showThroughEllipsoid = (typeof t.showThroughEllipsoid === 'undefined') ? false : t.showThroughEllipsoid;

        /**
         * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
         * coordinates, the sensor's principal direction is along the positive z-axis.  The clock angle, sometimes
         * called azimuth, is the angle in the sensor's X-Y plane measured from the positive X-axis toward the positive
         * Y-axis.  The cone angle, sometimes called elevation, is the angle out of the X-Y plane along the positive Z-axis.
         * This matrix is available to GLSL vertex and fragment shaders via
         * {@link agi_model} and derived uniforms.
         * <br /><br />
         * <div align='center'>
         * <img src='images/CustomSensorVolume.setModelMatrix.png' /><br />
         * Model coordinate system for a custom sensor
         * </div>
         *
         * @type Matrix4
         *
         * @see agi_model
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's opens upward, along the surface normal.
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * sensor.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = t.modelMatrix || Matrix4.IDENTITY;

        /**
         * DOC_TBA
         *
         * @type BufferUsage
         */
        this.bufferUsage = t.bufferUsage || BufferUsage.STATIC_DRAW;
        this._bufferUsage = t.bufferUsage || BufferUsage.STATIC_DRAW;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.radius = (typeof t.radius === 'undefined') ? Number.POSITIVE_INFINITY : t.radius;

        this._directions = undefined;
        this._directionsDirty = false;
        this.setDirections(t.directions);

        /**
         * DOC_TBA
         */
        this.material = t.material || new ColorMaterial();
        this._material = undefined;

        /**
         * DOC_TBA
         */
        this.intersectionColor = (typeof t.intersectionColor !== 'undefined') ? Color.clone(t.intersectionColor) : new Color(1.0, 1.0, 0.0, 1.0);

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = (typeof t.erosion === 'undefined') ? 1.0 : t.erosion;

        var that = this;
        this._uniforms = {
            u_model : function() {
                return that.modelMatrix;
            },
            u_showThroughEllipsoid : function() {
                return that.showThroughEllipsoid;
            },
            u_showIntersection : function() {
                return that.showIntersection;
            },
            u_sensorRadius : function() {
                return isFinite(that.radius) ? that.radius : FAR;
            },
            u_intersectionColor : function() {
                return that.intersectionColor;
            },
            u_erosion : function() {
                return that.erosion;
            }
        };
        this._drawUniforms = null;
        this._pickUniforms = null;

        this._mode = SceneMode.SCENE3D;
    };

    /**
     * DOC_TBA
     *
     * @memberof CustomSensorVolume
     *
     * @see CustomSensorVolume#getDirections
     */
    CustomSensorVolume.prototype.setDirections = function(directions) {
        this._directions = directions;
        this._directionsDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof CustomSensorVolume
     *
     * @see CustomSensorVolume#setDirections
     */
    CustomSensorVolume.prototype.getDirections = function() {
        return this._directions;
    };

    CustomSensorVolume._computePositions = function(directions, radius) {
        var length = directions.length;
        var positions = new Float32Array(3 * length);
        var r = isFinite(radius) ? radius : FAR;

        for ( var i = length - 2, j = length - 1, k = 0; k < length; i = j++, j = k++) {
            // PERFORMANCE_IDEA:  We can avoid redundant operations for adjacent edges.
            var n0 = Cartesian3.fromSpherical(directions[i]);
            var n1 = Cartesian3.fromSpherical(directions[j]);
            var n2 = Cartesian3.fromSpherical(directions[k]);

            // Extend position so the volume encompasses the sensor's radius.
            var theta = Math.max(Cartesian3.angleBetween(n0, n1), Cartesian3.angleBetween(n1, n2));
            var distance = r / Math.cos(theta * 0.5);
            var p = n1.multiplyByScalar(distance);

            positions[(j * 3) + 0] = p.x;
            positions[(j * 3) + 1] = p.y;
            positions[(j * 3) + 2] = p.z;
        }

        return positions;
    };

    CustomSensorVolume._createVertexArray = function(context, directions, radius, bufferUsage) {
        var positions = this._computePositions(directions, radius);

        var length = directions.length;
        var vertices = new Float32Array(2 * 3 * 3 * length);

        var k = 0;
        for ( var i = length - 1, j = 0; j < length; i = j++) {
            var p0 = new Cartesian3(positions[(i * 3) + 0], positions[(i * 3) + 1], positions[(i * 3) + 2]);
            var p1 = new Cartesian3(positions[(j * 3) + 0], positions[(j * 3) + 1], positions[(j * 3) + 2]);
            var n = p1.cross(p0).normalize(); // Per-face normals

            vertices[k++] = 0.0; // Sensor vertex
            vertices[k++] = 0.0;
            vertices[k++] = 0.0;
            vertices[k++] = n.x;
            vertices[k++] = n.y;
            vertices[k++] = n.z;

            vertices[k++] = p1.x;
            vertices[k++] = p1.y;
            vertices[k++] = p1.z;
            vertices[k++] = n.x;
            vertices[k++] = n.y;
            vertices[k++] = n.z;

            vertices[k++] = p0.x;
            vertices[k++] = p0.y;
            vertices[k++] = p0.z;
            vertices[k++] = n.x;
            vertices[k++] = n.y;
            vertices[k++] = n.z;
        }

        var vertexBuffer = context.createVertexBuffer(new Float32Array(vertices), bufferUsage);
        var stride = 2 * 3 * Float32Array.BYTES_PER_ELEMENT;

        var attributes = [{
            index : attributeIndices.position,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            offsetInBytes : 0,
            strideInBytes : stride
        }, {
            index : attributeIndices.normal,
            vertexBuffer : vertexBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            offsetInBytes : 3 * Float32Array.BYTES_PER_ELEMENT,
            strideInBytes : stride
        }];

        return context.createVertexArray(attributes);
    };

    /**
     * DOC_TBA
     *
     * @memberof CustomSensorVolume
     *
     * @exception {DeveloperError} this.radius must be greater than or equal to zero.
     */
    CustomSensorVolume.prototype.update = function(context, sceneState) {
        this._mode = sceneState.mode;
        if (this._mode !== SceneMode.SCENE3D) {
            return;
        }

        if (this.radius < 0.0) {
            throw new DeveloperError('this.radius must be greater than or equal to zero.');
        }

        if (this.show) {
            // Initial render state creation
            if (!this._rs) {
                this._rs = context.createRenderState({
                    blending : {
                        enabled : true,
                        equationRgb : BlendEquation.ADD,
                        equationAlpha : BlendEquation.ADD,
                        functionSourceRgb : BlendFunction.SOURCE_ALPHA,
                        functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
                        functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
                        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
                    },
                    depthTest : {
                        enabled : true
                    },
                    depthMask : false
                });
            }
            // This would be better served by depth testing with a depth buffer that does not
            // include the ellipsoid depth - or a g-buffer containing an ellipsoid mask
            // so we can selectively depth test.
            this._rs.depthTest.enabled = !this.showThroughEllipsoid;

            // Recompile shader when material changes
            if (!this._material || (this._material !== this.material)) {

                this.material = this.material || new ColorMaterial();
                this._material = this.material;

                var fsSource =
                    '#line 0\n' +
                    ShadersNoise +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    this._material._getShaderSource() +
                    '#line 0\n' +
                    CustomSensorVolumeFS;

                this._sp = this._sp && this._sp.release();
                this._sp = context.getShaderCache().getShaderProgram(CustomSensorVolumeVS, fsSource, attributeIndices);

                this._drawUniforms = combine(this._uniforms, this._material._uniforms);
            }

            // Recreate vertex buffer when directions change
            if ((this._directionsDirty) || (this._bufferUsage !== this.bufferUsage)) {
                this._directionsDirty = false;
                this._bufferUsage = this.bufferUsage;
                this._va = this._va && this._va.destroy();

                var directions = this._directions;
                if (directions && (directions.length >= 3)) {
                    this._va = CustomSensorVolume._createVertexArray(context, directions, this.radius, this.bufferUsage);
                }
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof CustomSensorVolume
     */
    CustomSensorVolume.prototype.render = function(context) {
        if (this._mode === SceneMode.SCENE3D && this.show && this._va) {
            context.draw({
                primitiveType : PrimitiveType.TRIANGLES,
                shaderProgram : this._sp,
                uniformMap : this._drawUniforms,
                vertexArray : this._va,
                renderState : this._rs
            });
        }
    };

    /**
     * DOC_TBA
     * @memberof CustomSensorVolume
     */
    CustomSensorVolume.prototype.updateForPick = function(context) {
        if (this._mode === SceneMode.SCENE3D && this.show && this._va) {
            // Since this ignores all other materials, if a material does discard, the sensor will still be picked.
            var fsSource =
                '#define RENDER_FOR_PICK 1\n' +
                '#line 0\n' +
                ShadersSensorVolume +
                '#line 0\n' +
                CustomSensorVolumeFS;

            this._spPick = context.getShaderCache().getShaderProgram(CustomSensorVolumeVS, fsSource, attributeIndices);
            this._pickId = context.createPickId(this._pickIdThis);

            var that = this;
            this._pickUniforms = combine(this._uniforms, {
                u_pickColor : function() {
                    return that._pickId.normalizedRgba;
                }
            });

            this.updateForPick = function(context) {
            };
        }
    };

    /**
     * DOC_TBA
     * @memberof CustomSensorVolume
     */
    CustomSensorVolume.prototype.renderForPick = function(context, framebuffer) {
        if (this._mode === SceneMode.SCENE3D && this.show && this._va) {
            context.draw({
                primitiveType : PrimitiveType.TRIANGLES,
                shaderProgram : this._spPick,
                uniformMap : this._pickUniforms,
                vertexArray : this._va,
                renderState : this._rs,
                framebuffer : framebuffer
            });
        }
    };

    /**
     * DOC_TBA
     * @memberof CustomSensorVolume
     */
    CustomSensorVolume.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof CustomSensorVolume
     */
    CustomSensorVolume.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.release();
        this._spPick = this._spPick && this._spPick.release();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return CustomSensorVolume;
});
