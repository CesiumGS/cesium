(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.CustomRendering = function (scene, ellipsoid, primitives) {
        this.code = function () {
            Sandbox.ExamplePrimitive = function(position) {
                var ellipsoid = Cesium.Ellipsoid.WGS84;

                this._ellipsoid = ellipsoid;
                this._va = undefined;
                this._sp = undefined;
                this._rs = undefined;
                this._pickId = undefined;

                this._boundingVolume = undefined;

                this.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

                var that = this;
                this._drawUniforms = {
                    u_model : function() { return that.modelMatrix; },
                    u_color : function() { return { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }; }
                };
                this._pickUniforms = {
                    u_model : function() { return that.modelMatrix; },
                    u_color : function() { return that._pickId.normalizedRgba; }
                };
            };

            Sandbox.ExamplePrimitive.prototype.update = function(context, sceneState) {
                var vs = '';
                vs += 'attribute vec4 position;';
                vs += 'void main()';
                vs += '{';
                vs += '    gl_Position = agi_modelViewProjection * position;';
                vs += '}';
                var fs = '';
                fs += 'uniform vec4 u_color;';
                fs += 'void main()';
                fs += '{';
                fs += '    gl_FragColor = u_color;';
                fs += '}';

                var zLength = this._ellipsoid.getRadii().getMaximumComponent() * 0.1;
                var x = zLength * 0.1;
                var y = zLength * 0.5;
                var z = zLength;

                this._boundingVolume = Cesium.BoundingSphere.fromPoints([
                    new Cesium.Cartesian3(x, 0.0, 0.0),
                    new Cesium.Cartesian3(0.0, y, 0.0),
                    new Cesium.Cartesian3(0.0, 0.0, z)
                ]);

                var mesh = Cesium.MeshFilters.toWireframeInPlace(
                               Cesium.BoxTessellator.compute({
                                  dimensions : new Cesium.Cartesian3(x, y, z)
                                }));
                var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);

                this._va = context.createVertexArrayFromMesh({
                    mesh             : mesh,
                    attributeIndices : attributeIndices,
                    bufferUsage      : Cesium.BufferUsage.STATIC_DRAW
                });

                this._sp = context.getShaderCache().getShaderProgram(vs, fs, attributeIndices);

                this._rs = context.createRenderState({
                    depthTest : {
                        enabled : true
                    }
                });

                this.update = this._update;
                return this._update(context, sceneState);
            };

            Sandbox.ExamplePrimitive.prototype._update = function(context, sceneState) {
                return {
                    boundingVolume : this._boundingVolume,
                    modelMatrix : this._modelMatrix
                };
            };

            Sandbox.ExamplePrimitive.prototype.render = function(context) {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.LINES,
                    shaderProgram : this._sp,
                    uniformMap    : this._drawUniforms,
                    vertexArray   : this._va,
                    renderState   : this._rs
                });
            };

            Sandbox.ExamplePrimitive.prototype.updateForPick = function(context) {
                this._pickId = this._pickId || context.createPickId(this);
                this.updateForPick = function() {};
            };

            Sandbox.ExamplePrimitive.prototype.renderForPick = function(context, framebuffer) {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.LINES,
                    shaderProgram : this._sp,
                    uniformMap    : this._pickUniforms,
                    vertexArray   : this._va,
                    renderState   : this._rs,
                    framebuffer   : framebuffer
                });
            };

            Sandbox.ExamplePrimitive.prototype.isDestroyed = function() {
                return false;
            };

            Sandbox.ExamplePrimitive.prototype.destroy = function () {
                this._va = this._va && this._va.destroy();
                this._sp = this._sp && this._sp.release();
                this._pickId = this._pickId && this._pickId.destroy();
                return Cesium.destroyObject(this);
            };

            primitives.add(new Sandbox.ExamplePrimitive(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883))));
        };

        this.clear = function () {
            delete Sandbox.ExamplePrimitive;
        };
    };

    Sandbox.CustomRenderingAcrossModes = function (scene, ellipsoid, primitives) {
        this.code = function () {
            Sandbox.ExamplePrimitive = function(position) {
                var ellipsoid = Cesium.Ellipsoid.WGS84;

                this._ellipsoid = ellipsoid;
                this._va = undefined;
                this._sp = undefined;
                this._rs = undefined;
                this._pickId = undefined;

                this._boundingVolume = undefined;
                this._boundingVolumeCV = undefined;
                this._boundingVolume2D = undefined;

                this._mode = undefined;
                this._projection = undefined;

                this._attributeIndices = {
                    position2D : 0,
                    position3D : 1
                };

                this.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
                this.morphTime = 1.0;

                var that = this;
                this._drawUniforms = {
                    u_model : function() { return (that._mode === Cesium.SceneMode.SCENE3D) ? that.modelMatrix : Cesium.Matrix4.IDENTITY; },
                    u_color : function() { return { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }; },
                    u_morphTime : function() { return that.morphTime; }
                };
                this._pickUniforms = {
                    u_model : function() { return (that._mode === Cesium.SceneMode.SCENE3D) ? that.modelMatrix : Cesium.Matrix4.IDENTITY; },
                    u_color : function() { return that._pickId.normalizedRgba; },
                    u_morphTime : function() { return that.morphTime; }
                };
            };

            Sandbox.ExamplePrimitive.prototype.update = function(context, sceneState) {
                var vs = '';
                vs += 'attribute vec3 position2D;';
                vs += 'attribute vec3 position3D;';
                vs += 'uniform float u_morphTime;';
                vs += 'void main()';
                vs += '{';
                vs += '    vec4 p = agi_columbusViewMorph(position2D, position3D, u_morphTime);';
                vs += '    gl_Position = agi_modelViewProjection * p;';
                vs += '}';
                var fs = '';
                fs += 'uniform vec4 u_color;';
                fs += 'void main()';
                fs += '{';
                fs += '    gl_FragColor = u_color;';
                fs += '}';

                this._sp = context.getShaderCache().getShaderProgram(vs, fs, this._attributeIndices);

                this._rs = context.createRenderState({
                    depthTest : {
                        enabled : true
                    }
                });

                this.update = this._update;
                return this._update(context, sceneState);
            };

            Sandbox.ExamplePrimitive.prototype._update = function(context, sceneState) {
                var mode = sceneState.mode;
                var projection = sceneState.scene2D.projection;

                if (mode !== this._mode || projection !== this._projection) {
                    this._mode = mode;
                    this._projection = projection;
                    this.morphTime = this._mode.morphTime;

                    var zLength = this._ellipsoid.getRadii().getMaximumComponent() * 0.1;
                    var x = zLength * 0.1;
                    var y = zLength * 0.5;
                    var z = zLength;

                    var mesh = Cesium.MeshFilters.toWireframeInPlace(
                            Cesium.BoxTessellator.compute({
                                dimensions : new Cesium.Cartesian3(x, y, z)
                              }));
                    mesh.attributes.position3D = mesh.attributes.position;
                    delete mesh.attributes.position;

                    this._boundingVolume = Cesium.BoundingSphere.fromPoints([
                        new Cesium.Cartesian3(x, 0.0, 0.0),
                        new Cesium.Cartesian3(0.0, y, 0.0),
                        new Cesium.Cartesian3(0.0, 0.0, z)
                    ]);

                    if (mode === Cesium.SceneMode.SCENE3D) {
                        mesh.attributes.position2D = { // Not actually used in shader
                                value : [0.0, 0.0]
                            };
                    } else {
                        var positions = mesh.attributes.position3D.values;
                        var projectedPositions = [];
                        var projectedPositionsFlat = [];
                        for (var i = 0; i < positions.length; i += 3) {
                            var p = new Cesium.Cartesian3(positions[i], positions[i + 1], positions[i + 2]);
                            p = this.modelMatrix.multiplyByVector(new Cesium.Cartesian4(p.x, p.y, p.z, 1.0));
                            p = projection.project(this._ellipsoid.cartesianToCartographic(Cesium.Cartesian3.fromCartesian4(p)));

                            projectedPositions.push(p);
                            projectedPositionsFlat.push(p.z, p.x, p.y);
                        }

                        this._boundingVolumeCV = Cesium.BoundingSphere.fromPoints(projectedPositions);
                        this._boundingVolumeCV.center = new Cesium.Cartesian3(this._boundingVolumeCV.center.z, this._boundingVolumeCV.center.x, this._boundingVolumeCV.center.y);
                        this._boundingVolume2D = Cesium.BoundingRectangle.fromPoints(projectedPositions);

                        mesh.attributes.position2D = {
                                componentDatatype : Cesium.ComponentDatatype.FLOAT,
                                componentsPerAttribute : 3,
                                values : projectedPositionsFlat
                        };
                    }

                    this._va = this._va && this._va.destroy();
                    this._va = context.createVertexArrayFromMesh({
                        mesh             : mesh,
                        attributeIndices : this._attributeIndices,
                        bufferUsage      : Cesium.BufferUsage.STATIC_DRAW
                    });
                }

                var boundingVolume;
                var modelMatrix = Cesium.Matrix4.IDENTITY;

                if (mode === Cesium.SceneMode.SCENE3D) {
                    boundingVolume = this._boundingVolume.clone();
                    modelMatrix = this.modelMatrix.clone();
                } else if (mode === Cesium.SceneMode.COLUMBUS_VIEW) {
                    boundingVolume = this._boundingVolumeCV.clone();
                } else if (mode === Cesium.SceneMode.SCENE2D) {
                    boundingVolume = this._boundingVolume2D.clone();
                } else {
                    boundingVolume = this._boundingVolume.union(this._boundingVolumeCV);
                }

                return {
                    boundingVolume : boundingVolume,
                    modelMatrix : modelMatrix
                };
            };

            Sandbox.ExamplePrimitive.prototype.render = function(context) {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.LINES,
                    shaderProgram : this._sp,
                    uniformMap    : this._drawUniforms,
                    vertexArray   : this._va,
                    renderState   : this._rs
                });
            };

            Sandbox.ExamplePrimitive.prototype.updateForPick = function(context) {
                this._pickId = this._pickId || context.createPickId(this);
                this.updateForPick = function() {};
            };

            Sandbox.ExamplePrimitive.prototype.renderForPick = function(context, framebuffer) {
                context.draw({
                    primitiveType : Cesium.PrimitiveType.LINES,
                    shaderProgram : this._sp,
                    uniformMap    : this._pickUniforms,
                    vertexArray   : this._va,
                    renderState   : this._rs,
                    framebuffer   : framebuffer
                });
            };

            Sandbox.ExamplePrimitive.prototype.isDestroyed = function() {
                return false;
            };

            Sandbox.ExamplePrimitive.prototype.destroy = function () {
                this._va = this._va && this._va.destroy();
                this._sp = this._sp && this._sp.release();
                this._pickId = this._pickId && this._pickId.destroy();
                return Cesium.destroyObject(this);
            };

            primitives.add(new Sandbox.ExamplePrimitive(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883))));
        };

        this.clear = function () {
            delete Sandbox.ExamplePrimitive;
        };
    };

}());
