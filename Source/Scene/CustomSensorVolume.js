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
        '../Core/BoundingSphere',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './Material',
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
        BoundingSphere,
        BufferUsage,
        BlendingState,
        CommandLists,
        DrawCommand,
        Material,
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

        this._pickId = undefined;
        this._pickIdThis = t._pickIdThis || this;

        this._colorCommand = new DrawCommand();
        this._pickCommand = new DrawCommand();
        this._commandLists = new CommandLists();

        this._colorCommand.primitiveType = this._pickCommand.primitiveType = PrimitiveType.TRIANGLES;
        this._colorCommand.boundingVolume = this._pickCommand.boundingVolume = new BoundingSphere();

        /**
         * <code>true</code> if this sensor will be shown; otherwise, <code>false</code>
         *
         * @type Boolean
         */
        this.show = (typeof t.show === 'undefined') ? true : t.show;

        /**
         * When <code>true</code>, a polyline is shown where the sensor outline intersections the central body.  The default is <code>true</code>.
         *
         * @type Boolean
         *
         * @see CustomSensorVolume#intersectionColor
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
         * {@link czm_model} and derived uniforms.
         * <br /><br />
         * <div align='center'>
         * <img src='images/CustomSensorVolume.setModelMatrix.png' /><br />
         * Model coordinate system for a custom sensor
         * </div>
         *
         * @type Matrix4
         *
         * @see czm_model
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's opens upward, along the surface normal.
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * sensor.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = t.modelMatrix || Matrix4.IDENTITY.clone();

        /**
         * <p>
         * Determines if the sensor is affected by lighting, i.e., if the sensor is bright on the
         * day side of the globe, and dark on the night side.  When <code>true</code>, the sensor
         * is affected by lighting; when <code>false</code>, the sensor is uniformly shaded regardless
         * of the sun position.
         * </p>
         * <p>
         * The default is <code>true</code>.
         * </p>
         */
        this.affectedByLighting = this._affectedByLighting = (typeof t.affectedByLighting !== 'undefined') ? t.affectedByLighting : true;

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
         * The surface appearance of the sensor.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type Material
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * sensor.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * sensor.material = Material.fromType(scene.getContext(), Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = (typeof t.material !== 'undefined') ? t.material : Material.fromType(undefined, Material.ColorType);
        this._material = undefined;

        /**
         * The color of the polyline where the sensor outline intersects the central body.  The default is {@link Color.WHITE}.
         *
         * @type Color
         *
         * @see CustomSensorVolume#showIntersection
         */
        this.intersectionColor = (typeof t.intersectionColor !== 'undefined') ? Color.clone(t.intersectionColor) : Color.clone(Color.WHITE);

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = (typeof t.erosion === 'undefined') ? 1.0 : t.erosion;

        var that = this;
        this._uniforms = {
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

    CustomSensorVolume.prototype._computePositions = function() {
        var directions = this._directions;
        var length = directions.length;
        var positions = new Float32Array(3 * length);
        var r = isFinite(this.radius) ? this.radius : FAR;

        var boundingVolumePositions = [Cartesian3.ZERO];

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

            boundingVolumePositions.push(p);
        }

        BoundingSphere.fromPoints(boundingVolumePositions, this._colorCommand.boundingVolume);

        return positions;
    };

    CustomSensorVolume.prototype._createVertexArray = function(context) {
        var positions = this._computePositions();

        var length = this._directions.length;
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

        var vertexBuffer = context.createVertexBuffer(new Float32Array(vertices), this.bufferUsage);
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
     * @exception {DeveloperError} this.material must be defined.
     */
    CustomSensorVolume.prototype.update = function(context, frameState, commandList) {
        this._mode = frameState.mode;
        if (!this.show || this._mode !== SceneMode.SCENE3D) {
            return;
        }

        if (this.radius < 0.0) {
            throw new DeveloperError('this.radius must be greater than or equal to zero.');
        }

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        // Initial render state creation
        if (typeof this._colorCommand.renderState === 'undefined') {
            this._colorCommand.renderState = this._pickCommand.renderState = context.createRenderState({
                depthTest : {
                    enabled : true
                },
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });
        }
        // This would be better served by depth testing with a depth buffer that does not
        // include the ellipsoid depth - or a g-buffer containing an ellipsoid mask
        // so we can selectively depth test.
        this._colorCommand.renderState.depthTest.enabled = !this.showThroughEllipsoid;

        // Recreate vertex buffer when directions change
        if ((this._directionsDirty) || (this._bufferUsage !== this.bufferUsage)) {
            this._directionsDirty = false;
            this._bufferUsage = this.bufferUsage;
            this._va = this._va && this._va.destroy();

            var directions = this._directions;
            if (directions && (directions.length >= 3)) {
                this._colorCommand.vertexArray = this._pickCommand.vertexArray = this._createVertexArray(context);
            }
        }

        if (typeof this._colorCommand.vertexArray === 'undefined') {
            return;
        }

        var pass = frameState.passes;
        this._colorCommand.modelMatrix = this._pickCommand.modelMatrix = this.modelMatrix;
        this._commandLists.removeAll();

        if (pass.color) {
            var materialChanged = typeof this._material === 'undefined' ||
                this._material !== this.material ||
                this._affectedByLighting !== this.affectedByLighting;

            // Recompile shader when material changes
            if (materialChanged) {
                this._material = this.material;
                this._affectedByLighting = this.affectedByLighting;

                var fsSource =
                    '#line 0\n' +
                    ShadersNoise +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    this._material.shaderSource +
                    (this._affectedByLighting ? '#define AFFECTED_BY_LIGHTING 1\n' : '') +
                    '#line 0\n' +
                    CustomSensorVolumeFS;

                this._colorCommand.shaderProgram = this._colorCommand.shaderProgram && this._colorCommand.shaderProgram.release();
                this._colorCommand.shaderProgram = context.getShaderCache().getShaderProgram(CustomSensorVolumeVS, fsSource, attributeIndices);

                this._colorCommand.uniformMap = combine([this._uniforms, this._material._uniforms], false, false);
            }

            this._commandLists.colorList.push(this._colorCommand);
        }

        if (pass.pick) {
            if (typeof this._pickId === 'undefined') {
                // Since this ignores all other materials, if a material does discard, the sensor will still be picked.
                var fsPickSource =
                    '#define RENDER_FOR_PICK 1\n' +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    CustomSensorVolumeFS;

                this._pickCommand.shaderProgram = context.getShaderCache().getShaderProgram(CustomSensorVolumeVS, fsPickSource, attributeIndices);
                this._pickId = context.createPickId(this._pickIdThis);

                var that = this;
                this._pickCommand.uniformMap = combine([this._uniforms, {
                    u_pickColor : function() {
                        return that._pickId.normalizedRgba;
                    }
                }], false, false);
            }

            this._commandLists.pickList.push(this._pickCommand);
        }

        if (!this._commandLists.empty()) {
            commandList.push(this._commandLists);
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
        this._colorCommand.vertexArray = this._colorCommand.vertexArray && this._colorCommand.vertexArray.destroy();
        this._colorCommand.shaderProgram = this._colorCommand.shaderProgram && this._colorCommand.shaderProgram.release();
        this._pickCommand.shaderProgram = this._pickCommand.shaderProgram && this._pickCommand.shaderProgram.release();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return CustomSensorVolume;
});
