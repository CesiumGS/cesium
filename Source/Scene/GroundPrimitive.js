/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PolygonGeometry',
        '../Core/VertexFormat',
        '../Renderer/DrawCommand',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        '../ThirdParty/when',
        './BlendingState',
        './CullFace',
        './DepthFunction',
        './Pass',
        './PerInstanceColorAppearance',
        './Primitive',
        './StencilFunction',
        './StencilOperation'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        PolygonGeometry,
        VertexFormat,
        DrawCommand,
        ShadowVolumeFS,
        ShadowVolumeVS,
        when,
        BlendingState,
        CullFace,
        DepthFunction,
        Pass,
        PerInstanceColorAppearance,
        Primitive,
        StencilFunction,
        StencilOperation) {
    "use strict";

    var GroundPrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.show = defaultValue(options.show, true);
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._sp = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;

        this._rsZPassStencil = undefined;
        this._rsZPassColor = undefined;

        this._stencilPreloadPassCommands = undefined;
        this._stencilDepthPassCommands = undefined;
        this._colorPassCommands = undefined;

        this._zPassStencilCommands = undefined;
        this._zPassColorCommands = undefined;

        this._primitiveCommandList = [];

        this._ready = false;
        this._readyPromise = when.defer();

        var geometryInstances = options.geometryInstances;
        var length = geometryInstances.length;

        var instances = new Array(length);

        // TODO
        var maxAlt = 8500.0;
        var minAlt = -12000.0;

        for (var i = 0; i < length; ++i) {
            var instance = geometryInstances[i];
            var geometry = instance.geometry;
            if (!(geometry instanceof PolygonGeometry)) {
                // TODO
                throw new DeveloperError('All geometry must be an instance of PolygonGeometry.');
            }

            // TODO: stRotation, granularity
            instances[i] = new GeometryInstance({
                geometry : new PolygonGeometry({
                    polygonHierarchy : geometry._polygonHierarchy,
                    ellipsoid : geometry._ellipsoid,
                    stRotation : 0.0,
                    granularity : CesiumMath.toRadians(6.0),
                    perPositionHeight : false,
                    extrudedHeight : minAlt,
                    height : maxAlt,
                    vertexFormat : VertexFormat.POSITION_ONLY
                }),
                attributes : instance.attributes,
                modelMatrix : Matrix4.IDENTITY,
                id : instance.id
            });
        }

        var appearance = new PerInstanceColorAppearance({
            flat : true
        });

        var primitiveOptions = {
            geometryInstances : instances,
            appearance : appearance,
            vertexCacheOptimize : options.vertexCacheOptimizations,
            interleave : options.interleave,
            releaseGeometryInstances : options.releaseGeometryInstances,
            allowPicking : options.allowPicking,
            asynchronous : options.asynchronous,
            compressVertices : options.compressVertices
        };

        this._primitive = new Primitive(primitiveOptions);

        var that = this;
        this._primitive.readyPromise.then(function(primitive) {
            that._ready = true;

            var error = primitive._error;
            if (!defined(error)) {
                that._readyPromise.resolve(that);
            } else {
                that._readyPromise.reject(error);
            }
        });
    };

    var stencilPreloadRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.DECREMENT_WRAP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.INCREMENT_WRAP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false
    };

    var stencilDepthRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : true,
            func : DepthFunction.LESS_OR_EQUAL
        },
        depthMask : false
    };

    var colorRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false,
        blending : BlendingState.ALPHA_BLEND
    };

    var zPassStencilRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : true,
            func : DepthFunction.LESS
        },
        depthMask : false
    };

    var zPassColorRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT
            },
            reference : 0,
            mask : ~0
        },
        cull : {
            enabled : true,
            face : CullFace.BACK
        },
        depthTest : {
            enabled : true
        },
        depthMask : false,
        blending : BlendingState.ALPHA_BLEND
    };

    GroundPrimitive.prototype.update = function(context, frameState, commandList) {
        // TODO: Determine if supported
        if (!this.show) {
            return;
        }

        var primitiveCommandList = this._primitiveCommandList;
        primitiveCommandList.length = 0;
        this._primitive.update(context, frameState, primitiveCommandList);

        if (!this._ready) {
            return;
        }

        if (!defined(this._sp)) {
            var vs = Primitive._createColumbusViewShader(ShadowVolumeVS, frameState.scene3DOnly);
            vs = Primitive._appendShowToShader(this._primitive, vs);

            var fs = ShadowVolumeFS;
            var attributeLocations = this._primitive._attributeLocations;

            this._sp = context.replaceShaderProgram(this._sp, vs, fs, attributeLocations);
        }

        if (!defined(this._rsStencilPreloadPass)) {
            this._rsStencilPreloadPass = context.createRenderState(stencilPreloadRenderState);
            this._rsStencilDepthPass = context.createRenderState(stencilDepthRenderState);
            this._rsColorPass = context.createRenderState(colorRenderState);

            this._rsZPassStencil = context.createRenderState(zPassStencilRenderState);
            this._rsZPassColor = context.createRenderState(zPassColorRenderState);
        }

        if (!defined(this._stencilPreloadPassCommands)) {
            var commandsLength = primitiveCommandList.length;

            this._stencilPreloadPassCommands = new Array(commandsLength);
            this._stencilDepthPassCommands = new Array(commandsLength);
            this._colorPassCommands = new Array(commandsLength);

            this._zPassStencilCommands = new Array(commandsLength);
            this._zPassColorCommands = new Array(commandsLength);

            for (var i = 0; i < commandsLength; ++i) {
                var primitiveCommand = primitiveCommandList[i];

                this._stencilPreloadPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsStencilPreloadPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._stencilDepthPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsStencilDepthPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._colorPassCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsColorPass,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._zPassStencilCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsZPassStencil,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });

                this._zPassColorCommands[i] = new DrawCommand({
                    primitiveType : primitiveCommand.primitiveType,
                    vertexArray : primitiveCommand.vertexArray,
                    renderState : this._rsZPassColor,
                    shaderProgram : this._sp,
                    uniformMap : primitiveCommand.uniformMap,
                    boundingVolume : primitiveCommand.boundingVolume,
                    owner : this,
                    modelMatrix : Matrix4.IDENTITY,
                    pass : Pass.GROUND
                });
            }
        }

        var stencilPreloadCommands = this._stencilPreloadPassCommands;
        var stencilDepthPassCommands = this._stencilDepthPassCommands;
        var colorPassCommands = this._colorPassCommands;

        var zPassStencilCommands = this._zPassStencilCommands;
        var zPassColorCommands = this._zPassColorCommands;

        var j;
        var length = primitiveCommandList.length;
        for (j = 0; j < length; ++j) {
            var command = primitiveCommandList[j];

            var stencilPreloadCommand = stencilPreloadCommands[j];
            stencilPreloadCommand.boundingVolume = command.boundingVolume;
            stencilPreloadCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var stencilDepthPassCommand = stencilDepthPassCommands[j];
            stencilDepthPassCommand.boundingVolume = command.boundingVolume;
            stencilDepthPassCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var colorCommand = colorPassCommands[j];
            colorCommand.boundingVolume = command.boundingVolume;
            colorCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var zPassStencilCommand = zPassStencilCommands[j];
            zPassStencilCommand.boundingVolume = command.boundingVolume;
            zPassStencilCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var zPassColorCommand = zPassColorCommands[j];
            zPassColorCommand.boundingVolume = command.boundingVolume;
            zPassColorCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;
        }

        length = stencilPreloadCommands.length;
        for (j = 0; j < length; ++j) {
            commandList.push(stencilPreloadCommands[j]);
        }
        for (j = 0; j < length; ++j) {
            commandList.push(stencilDepthPassCommands[j]);
        }
        for (j = 0; j < length; ++j) {
            commandList.push(colorPassCommands[j]);
        }
    };

    GroundPrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        return this._primitive.getGeometryInstanceAttributes(id);
    };

    return GroundPrimitive;
});