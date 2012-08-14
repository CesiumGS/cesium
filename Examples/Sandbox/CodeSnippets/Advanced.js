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

}());
