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
        '../Core/BoxTessellator',
        '../Core/BoundingSphere',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DrawCommand',
        '../Renderer/BlendingState',
        './Material',
        '../Shaders/Ray',
        '../Shaders/ConstructiveSolidGeometry',
        '../Shaders/SensorVolume',
        '../Shaders/ComplexConicSensorVolumeVS',
        '../Shaders/ComplexConicSensorVolumeFS',
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
        BoxTessellator,
        BoundingSphere,
        BufferUsage,
        CommandLists,
        CullFace,
        DrawCommand,
        BlendingState,
        Material,
        ShadersRay,
        ShadersConstructiveSolidGeometry,
        ShadersSensorVolume,
        ComplexConicSensorVolumeVS,
        ComplexConicSensorVolumeFS,
        SceneMode) {
    "use strict";

    var attributeIndices = {
        position : 0
    };

    /**
     * DOC_TBA
     *
     * @alias ComplexConicSensorVolume
     * @constructor
     *
     * @see SensorVolumeCollection#addComplexConic
     */
    var ComplexConicSensorVolume = function(template) {
        var t = template || {};

        this._pickId = undefined;

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
         * @see ComplexConicSensorVolume#intersectionColor
         */
        this.showIntersection = (typeof t.showIntersection === 'undefined') ? true : t.showIntersection;

        /**
         * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
         * coordinates, the sensor's principal direction is along the positive z-axis.  Minimum and maximum clock
         * angles are measured from the x-axis.  This matrix is available to GLSL vertex and fragment shaders via
         * {@link czm_model} and derived uniforms.
         * <br /><br />
         * <div align='center'>
         * <img src='images/ComplexConicSensorVolume.setModelMatrix.png' width='400' height='258' /><br />
         * Model coordinate system for a conic sensor
         * </div>
         *
         * @type Matrix4
         *
         * @see czm_model
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's cone opens upward, along the surface normal.
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * sensor.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = t.modelMatrix || Matrix4.IDENTITY.clone();

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see ComplexConicSensorVolume#outerHalfAngle
         */
        this.innerHalfAngle = (typeof t.innerHalfAngle === 'undefined') ? CesiumMath.PI_OVER_TWO : t.innerHalfAngle;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see ComplexConicSensorVolume#innerHalfAngle
         */
        this.outerHalfAngle = (typeof t.outerHalfAngle === 'undefined') ? CesiumMath.PI_OVER_TWO : t.outerHalfAngle;
        this._outerHalfAngle = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see ComplexConicSensorVolume#innerHalfAngle
         */
        this.maximumClockAngle = (typeof t.maximumClockAngle === 'undefined') ? Math.PI : t.maximumClockAngle;
        this._maximumClockAngle = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see ComplexConicSensorVolume#innerHalfAngle
         */
        this.minimumClockAngle = (typeof t.minimumClockAngle === 'undefined') ? -Math.PI : t.minimumClockAngle;
        this._minimumClockAnglee = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.radius = (typeof t.radius === 'undefined') ? Number.POSITIVE_INFINITY : t.radius;
        this._radius = undefined;

        //        /**
        //         * DOC_TBA
        //         *
        //         * @type Number
        //         */
        //        this.minimumClockAngle = (typeof t.minimumClockAngle === 'undefined') ? (-Math.PI / 4.0) : t.minimumClockAngle;

        //        /**
        //         * DOC_TBA
        //         *
        //         * @type Number
        //         */
        //        this.maximumClockAngle = (typeof t.maximumClockAngle === 'undefined') ? (Math.PI / 4.0) : t.maximumClockAngle;

        /**
         * DOC_TBA
         */
        this.outerMaterial = (typeof t.outerMaterial !== 'undefined') ? t.outerMaterial : Material.fromType(undefined, Material.ColorType);
        this._outerMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.innerMaterial = (typeof t.innerMaterial !== 'undefined') ? t.innerMaterial : Material.fromType(undefined, Material.ColorType);
        this._innerMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.capMaterial = (typeof t.capMaterial !== 'undefined') ? t.capMaterial : Material.fromType(undefined, Material.ColorType);
        this._capMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.silhouetteMaterial = (typeof t.silhouetteMaterial !== 'undefined') ? t.silhouetteMaterial : Material.fromType(undefined, Material.ColorType);
        this._silhouetteMaterial = undefined;

        /**
         * The color of the polyline where the sensor outline intersects the central body.  The default is {@link Color.WHITE}.
         *
         * @type Color
         *
         * @see ComplexConicSensorVolume#showIntersection
         */
        this.intersectionColor = (typeof t.intersectionColor !== 'undefined') ? Color.clone(t.intersectionColor) : Color.clone(Color.WHITE);

        var that = this;
        this._uniforms = {
            u_sensorRadius : function() {
                return isFinite(that.radius) ? that.radius : FAR;
            },
            u_outerHalfAngle : function() {
                return that.outerHalfAngle;
            },
            u_innerHalfAngle : function() {
                return that.innerHalfAngle;
            },
            u_maximumClockAngle : function() {
                return that.maximumClockAngle;
            },
            u_minimumClockAngle : function() {
                return that.minimumClockAngle;
            },
            u_showIntersection : function() {
                return that.showIntersection;
            },
            u_intersectionColor : function() {
                return that.intersectionColor;
            }
        };
        this._mode = SceneMode.SCENE3D;
    };

    ComplexConicSensorVolume.prototype._getBoundingVolume = function() {
        var r = isFinite(this.radius) ? this.radius : FAR;

        var mesh;
        var minimumCorner;
        var maximumCorner;
        if (this.outerHalfAngle <= CesiumMath.toRadians(45.0)) {
            // Bound sensor with a frustum
            var l = Math.tan(this.outerHalfAngle) * r;

            var positions = [
                Cartesian3.ZERO,           // Sensor vertex
                new Cartesian3(l, -l, r),  // Sensor cap: ( x, -y)
                new Cartesian3(l, l, r),   // Sensor cap: ( x,  y)
                new Cartesian3(-l, l, r),  // Sensor cap: (-x,  y)
                new Cartesian3(-l, -l, r)  // Sensor cap: (-x, -y)
            ];

            var values = [];
            for (var i = 0; i < positions.length; ++i) {
                values.push(positions[i].x, positions[i].y, positions[i].z);
            }

            mesh = {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : values
                    }
                },
                indexLists : [{
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : [
                              0, 1, 4, // bottom side
                              0, 4, 3, // left side
                              0, 3, 2, // top side
                              0, 2, 1, // right side
                              1, 2, 3, // top
                              1, 3, 4
                          ]
                }]
            };

            BoundingSphere.fromPoints(positions, this._colorCommand.boundingVolume);
        } else if (this.outerHalfAngle <= CesiumMath.toRadians(90.0)) {
         // Bound sensor with box in the +z half-space
            minimumCorner = new Cartesian3(-r, -r, 0.0);
            maximumCorner = new Cartesian3(r, r, r);

            mesh = BoxTessellator.compute({
                minimumCorner : minimumCorner,
                maximumCorner : maximumCorner
            });

            BoundingSphere.fromPoints([minimumCorner, maximumCorner], this._colorCommand.boundingVolume);
        } else {
            // Bound sensor with box
            minimumCorner = new Cartesian3(-r, -r, -r);
            maximumCorner = new Cartesian3(r, r, r);

            mesh = BoxTessellator.compute({
                minimumCorner : minimumCorner,
                maximumCorner : maximumCorner
            });

            BoundingSphere.fromPoints([minimumCorner, maximumCorner], this._colorCommand.boundingVolume);
        }

        return mesh;
    };

    ComplexConicSensorVolume.prototype._combineMaterials = function() {
        // On older/mobile hardware, we could do one pass per material to avoid
        // going over the maximum uniform limit

        var materials = {
            'czm_getOuterMaterial' : this.outerMaterial,
            'czm_getInnerMaterial' : this.innerMaterial,
            'czm_getCapMaterial' : this.capMaterial,
            'czm_getSilhouetteMaterial' : this.silhouetteMaterial
        };

        var combinedUniforms = {};
        var concatenatedSource = '';
        for (var materialId in materials) {
            if (materials.hasOwnProperty(materialId)) {
                var material = materials[materialId];
                var materialSource = material.shaderSource.replace(/czm_getMaterial/g, materialId);
                var materialUniforms = material._uniforms;
                for (var uniformName in materialUniforms) {
                    if (materialUniforms.hasOwnProperty(uniformName)) {
                        var count = 1;
                        var newUniformName = uniformName;
                        while (combinedUniforms.hasOwnProperty(newUniformName)) {
                            newUniformName = uniformName + count;
                            count += 1;
                        }
                        materialSource = materialSource.replace(new RegExp(uniformName, 'g'), newUniformName);
                        combinedUniforms[newUniformName] = materialUniforms[uniformName];
                    }
                }
                concatenatedSource += materialSource;
            }
        }
        return {
            _uniforms : combinedUniforms,
            shaderSource : concatenatedSource
        };
    };

    /**
     * DOC_TBA
     *
     * @memberof ComplexConicSensorVolume
     *
     * @exception {DeveloperError} this.innerHalfAngle cannot be greater than this.outerHalfAngle.
     * @exception {DeveloperError} this.radius must be greater than or equal to zero.
     * @exception {DeveloperError} this.outerMaterial must be defined.
     * @exception {DeveloperError} this.innerMaterial must be defined.
     * @exception {DeveloperError} this.capMaterial must be defined.
     * @exception {DeveloperError} this.silhouetteMaterial must be defined.
     */
    ComplexConicSensorVolume.prototype.update = function(context, frameState, commandList) {
        this._mode = frameState.mode;
        if (!this.show || this._mode !== SceneMode.SCENE3D) {
            return;
        }

        if (this.innerHalfAngle > this.outerHalfAngle) {
            throw new DeveloperError('this.innerHalfAngle cannot be greater than this.outerHalfAngle.');
        }

        if (this.radius < 0.0) {
            throw new DeveloperError('this.radius must be greater than or equal to zero.');
        }

        if (typeof this.outerMaterial === 'undefined') {
            throw new DeveloperError('this.outerMaterial must be defined.');
        }

        if (typeof this.innerMaterial === 'undefined') {
            throw new DeveloperError('this.innerMaterial must be defined.');
        }

        if (typeof this.capMaterial === 'undefined') {
            throw new DeveloperError('this.capMaterial must be defined.');
        }

        if (typeof this.silhouetteMaterial === 'undefined') {
            throw new DeveloperError('this.silhouetteMaterial must be defined.');
        }

        // Recreate vertex array when proxy geometry needs to change
        if ((this._outerHalfAngle !== this.outerHalfAngle) || (this._radius !== this.radius)) {
            this._outerHalfAngle = this.outerHalfAngle;
            this._radius = this.radius;

            this._colorCommand.vertexArray = this._pickCommand.vertexArray = context.createVertexArrayFromMesh({
                mesh : this._getBoundingVolume(),
                attributeIndices : attributeIndices,
                bufferUsage : BufferUsage.STATIC_DRAW
            });
        }

        if (typeof this._colorCommand.renderState === 'undefined') {
            this._colorCommand.renderState = this._pickCommand.renderState = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                blending : BlendingState.ALPHA_BLEND
               // Does not read or write depth
            });
        }

        var pass = frameState.passes;
        this._colorCommand.modelMatrix = this._colorCommand.modelMatrix = this.modelMatrix;

        this._commandLists.removeAll();
        if (pass.color) {
            var outerChanged = this._outerMaterial !== this.outerMaterial;
            var innerChanged = this._innerMaterial !== this.innerMaterial;
            var capChanged = this._capMaterial !== this.capMaterial;
            var silhouetteChanged = this._silhouetteMaterial !== this.silhouetteMaterial;
            var materialChanged = outerChanged || innerChanged || capChanged || silhouetteChanged;

            if (materialChanged) {
                this._outerMaterial = this.outerMaterial;
                this._innerMaterial = this.innerMaterial;
                this._capMaterial = this.capMaterial;
                this._silhouetteMaterial = this.silhouetteMaterial;

                var material = this._combineMaterials();
                this._colorCommand.uniformMap = combine([this._uniforms, material._uniforms], false, false);

                var fsSource =
                    '#line 0\n' +
                    ShadersRay +
                    '#line 0\n' +
                    ShadersConstructiveSolidGeometry +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    material.shaderSource +
                    '#line 0\n' +
                    ComplexConicSensorVolumeFS;

                this._colorCommand.shaderProgram = context.getShaderCache().replaceShaderProgram(
                    this._colorCommand.shaderProgram, ComplexConicSensorVolumeVS, fsSource, attributeIndices);
            }

            this._commandLists.colorList.push(this._colorCommand);
        }

        if (pass.pick) {
            if (typeof this._pickId === 'undefined') {
                // Since this ignores all other materials, if a material does discard, the sensor will still be picked.
                var fsPickSource =
                    '#define RENDER_FOR_PICK 1\n' +
                    '#line 0\n' +
                    ShadersRay +
                    '#line 0\n' +
                    ShadersConstructiveSolidGeometry +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    ComplexConicSensorVolumeFS;

                this._pickCommand.shaderProgram = context.getShaderCache().getShaderProgram(ComplexConicSensorVolumeVS, fsPickSource, attributeIndices);
                this._pickId = context.createPickId(this);

                var that = this;
                this._pickCommand.uniformMap = combine([this._uniforms, {
                    u_pickColor : function() {
                        return that._pickId.color;
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
     * @memberof ComplexConicSensorVolume
     */
    ComplexConicSensorVolume.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof ComplexConicSensorVolume
     */
    ComplexConicSensorVolume.prototype.destroy = function() {
        this._colorCommand.vertexArray = this._colorCommand.vertexArray && this._colorCommand.vertexArray.destroy();
        this._colorCommand.shaderProgram = this._colorCommand.shaderProgram && this._colorCommand.shaderProgram.release();
        this._pickCommand.shaderProgram = this._pickCommand.shaderProgram && this._pickCommand.shaderProgram.release();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return ComplexConicSensorVolume;
});
