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
        '../Renderer/BufferUsage',
        '../Renderer/CullFace',
        '../Renderer/BlendEquation',
        '../Renderer/BlendFunction',
        './ColorMaterial',
        './combineMaterials',
        '../Shaders/Noise',
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
        BufferUsage,
        CullFace,
        BlendEquation,
        BlendFunction,
        ColorMaterial,
        combineMaterials,
        ShadersNoise,
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

        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;

        this._spPick = undefined;
        this._pickId = undefined;

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
         * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
         * coordinates, the sensor's principal direction is along the positive z-axis.  Minimum and maximum clock
         * angles are measured from the x-axis.  This matrix is available to GLSL vertex and fragment shaders via
         * {@link agi_model} and derived uniforms.
         * <br /><br />
         * <div align='center'>
         * <img src='images/ComplexConicSensorVolume.setModelMatrix.png' width='400' height='258' /><br />
         * Model coordinate system for a conic sensor
         * </div>
         *
         * @type Matrix4
         *
         * @see agi_model
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's cone opens upward, along the surface normal.
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * sensor.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = t.modelMatrix || Matrix4.IDENTITY;

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
        this.outerMaterial = t.outerMaterial || new ColorMaterial();
        this._outerMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.innerMaterial = t.innerMaterial || new ColorMaterial();
        this._innerMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.capMaterial = t.capMaterial || new ColorMaterial();
        this._capMaterial = undefined;

        /**
         * DOC_TBA
         */
        this.silhouetteMaterial = t.silhouetteMaterial || new ColorMaterial();
        this._silhouetteMaterial = undefined;

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
            },
            u_erosion : function() {
                return that.erosion;
            }
        };
        this._drawUniforms = null;
        this._pickUniforms = null;
        this._mode = SceneMode.SCENE3D;
    };

    ComplexConicSensorVolume.prototype._getBoundingVolume = function() {
        var r = isFinite(this.radius) ? this.radius : FAR;

        if (this.outerHalfAngle <= CesiumMath.toRadians(45.0)) {
            // Bound sensor with a frustum
            var l = Math.tan(this.outerHalfAngle) * r;

            return {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [
                                  0.0, 0.0, 0.0, // Sensor vertex
                                    l,  -l,   r, // Sensor cap: ( x, -y)
                                    l,   l,   r, // Sensor cap: ( x,  y)
                                   -l,   l,   r, // Sensor cap: (-x,  y)
                                   -l,  -l,   r // Sensor cap: (-x, -y)
                              ]
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
        } else if (this.outerHalfAngle <= CesiumMath.toRadians(90.0)) {
            // Bound sensor with box in the +z half-space
            return BoxTessellator.compute({
                minimumCorner : new Cartesian3(-r, -r, 0.0),
                maximumCorner : new Cartesian3(r, r, r)
            });
        }

        // Bound sensor with box
        return BoxTessellator.compute({
            minimumCorner : new Cartesian3(-r, -r, -r),
            maximumCorner : new Cartesian3(r, r, r)
        });
    };

    ComplexConicSensorVolume.prototype._combineMaterials = function() {
        // On older/mobile hardware, we could do one pass per material to avoid
        // going over the maximum uniform limit
        return combineMaterials({
            material : this.outerMaterial,
            sourceTransform : function(source) {
                return source.replace(new RegExp('agi_getMaterialColor', 'g'), 'agi_getOuterMaterialColor');
            }
        }, {
            material : this.innerMaterial,
            sourceTransform : function(source) {
                return source.replace(new RegExp('agi_getMaterialColor', 'g'), 'agi_getInnerMaterialColor');
            }
        }, {
            material : this.capMaterial,
            sourceTransform : function(source) {
                return source.replace(new RegExp('agi_getMaterialColor', 'g'), 'agi_getCapMaterialColor');
            }
        }, {
            material : this.silhouetteMaterial,
            sourceTransform : function(source) {
                return source.replace(new RegExp('agi_getMaterialColor', 'g'), 'agi_getSilhouetteMaterialColor');
            }
        });
    };

    /**
     * DOC_TBA
     *
     * @memberof ComplexConicSensorVolume
     *
     * @exception {DeveloperError} this.innerHalfAngle cannot be greater than this.outerHalfAngle.
     * @exception {DeveloperError} this.radius must be greater than or equal to zero.
     */
    ComplexConicSensorVolume.prototype.update = function(context, sceneState) {
        this._mode = sceneState.mode;
        if (this._mode !== SceneMode.SCENE3D) {
            return;
        }

        if (this.innerHalfAngle > this.outerHalfAngle) {
            throw new DeveloperError('this.innerHalfAngle cannot be greater than this.outerHalfAngle.');
        }

        if (this.radius < 0.0) {
            throw new DeveloperError('this.radius must be greater than or equal to zero.');
        }

        if (this.show) {
            // Recreate vertex array when proxy geometry needs to change
            if ((this._outerHalfAngle !== this.outerHalfAngle) || (this._radius !== this.radius)) {
                this._outerHalfAngle = this.outerHalfAngle;
                this._radius = this.radius;

                this._va = context.createVertexArrayFromMesh({
                    mesh : this._getBoundingVolume(),
                    attributeIndices : attributeIndices,
                    bufferUsage : BufferUsage.STATIC_DRAW
                });
            }

            // Recompile shader when material changes
            if ((!this._outerMaterial || (this._outerMaterial !== this.outerMaterial)) ||
                (!this._innerMaterial || (this._innerMaterial !== this.innerMaterial)) ||
                (!this._capMaterial || (this._capMaterial !== this.capMaterial)) ||
                (!this._silhouetteMaterial || (this._silhouetteMaterial !== this.silhouetteMaterial))) {

                this._outerMaterial = this.outerMaterial || new ColorMaterial();
                this._innerMaterial = this.innerMaterial || new ColorMaterial();
                this._capMaterial = this.capMaterial || new ColorMaterial();
                this._silhouetteMaterial = this.silhouetteMaterial || new ColorMaterial();

                var material = this._combineMaterials();
                this._drawUniforms = combine(this._uniforms, material._uniforms);

                var fsSource =
                    '#line 0\n' +
                    ShadersNoise +
                    '#line 0\n' +
                    ShadersRay +
                    '#line 0\n' +
                    ShadersConstructiveSolidGeometry +
                    '#line 0\n' +
                    ShadersSensorVolume +
                    '#line 0\n' +
                    material._getShaderSource() +
                    '#line 0\n' +
                    ComplexConicSensorVolumeFS;

                this._sp = this._sp && this._sp.release();
                this._sp = context.getShaderCache().getShaderProgram(ComplexConicSensorVolumeVS, fsSource, attributeIndices);
            }

            // Initial render state creation
            this._rs = this._rs || context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                blending : {
                    enabled : true,
                    equationRgb : BlendEquation.ADD,
                    equationAlpha : BlendEquation.ADD,
                    functionSourceRgb : BlendFunction.SOURCE_ALPHA,
                    functionSourceAlpha : BlendFunction.SOURCE_ALPHA,
                    functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
                    functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
                }
            // Does not read or write depth
            });
        }
    };

    /**
     * DOC_TBA
     * @memberof ComplexConicSensorVolume
     */
    ComplexConicSensorVolume.prototype.render = function(context) {
        if (this._mode === SceneMode.SCENE3D && this.show) {
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
     * @memberof ComplexConicSensorVolume
     */
    ComplexConicSensorVolume.prototype.updateForPick = function(context) {
        if (this._mode === SceneMode.SCENE3D && this.show) {
            // Since this ignores all other materials, if a material does discard, the sensor will still be picked.
            var fsSource =
                '#define RENDER_FOR_PICK 1\n' +
                '#line 0\n' +
                ShadersRay +
                '#line 0\n' +
                ShadersConstructiveSolidGeometry +
                '#line 0\n' +
                ShadersSensorVolume +
                '#line 0\n' +
                ComplexConicSensorVolumeFS;

            this._spPick = context.getShaderCache().getShaderProgram(ComplexConicSensorVolumeVS, fsSource, attributeIndices);
            this._pickId = context.createPickId(this);

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
     * @memberof ComplexConicSensorVolume
     */
    ComplexConicSensorVolume.prototype.renderForPick = function(context, framebuffer) {
        if (this._mode === SceneMode.SCENE3D && this.show) {
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
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.release();
        this._spPick = this._spPick && this._spPick.release();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return ComplexConicSensorVolume;
});
