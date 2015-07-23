/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/Math',
        '../Renderer/DrawCommand',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        '../ThirdParty/when',
        './BlendingState',
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
        isArray,
        CesiumMath,
        DrawCommand,
        ShadowVolumeFS,
        ShadowVolumeVS,
        when,
        BlendingState,
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

        this._stencilPreloadPassCommands = undefined;
        this._stencilDepthPassCommands = undefined;
        this._colorPassCommands = undefined;

        this._primitiveCommandList = [];

        this._ready = false;
        this._readyPromise = when.defer();

        var geometryInstances = options.geometryInstances;
        geometryInstances = isArray(geometryInstances) ? geometryInstances : [geometryInstances];

        var length = geometryInstances.length;
        var instances = new Array(length);

        for (var i = 0; i < length; ++i) {
            var instance = geometryInstances[i];
            var geometry = instance.geometry;

            var instanceType = geometry.constructor;
            if (defined(instanceType) && defined(instanceType._createShadowVolume)) {
                instances[i] = new GeometryInstance({
                    geometry : instanceType._createShadowVolume(geometry, computeMinimumHeight, computeMaximumHeight),
                    attributes : instance.attributes,
                    modelMatrix : instance.modelMatrix,
                    id : instance.id
                });
            }
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

    GroundPrimitive._maxHeight = 9000.0;
    GroundPrimitive._minHeight = -75000.0;

    function computeMaximumHeight(granularity, ellipsoid) {
        var r = ellipsoid.maximumRadius;
        var delta = (r / Math.cos(granularity * 0.5)) - r;
        return GroundPrimitive._maxHeight + delta;
    }

    function computeMinimumHeight(granularity, ellipsoid) {
        return GroundPrimitive._minHeight;
    }

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
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
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

    GroundPrimitive.prototype.update = function(context, frameState, commandList) {
        if (!context.fragmentDepth || !this.show) {
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
        }

        if (!defined(this._stencilPreloadPassCommands)) {
            var commandsLength = primitiveCommandList.length;

            this._stencilPreloadPassCommands = new Array(commandsLength);
            this._stencilDepthPassCommands = new Array(commandsLength);
            this._colorPassCommands = new Array(commandsLength);

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
                    modelMatrix : primitiveCommand.modelMatrix,
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
                    modelMatrix : primitiveCommand.modelMatrix,
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
                    modelMatrix : primitiveCommand.modelMatrix,
                    pass : Pass.GROUND
                });
            }
        }

        var stencilPreloadCommands = this._stencilPreloadPassCommands;
        var stencilDepthPassCommands = this._stencilDepthPassCommands;
        var colorPassCommands = this._colorPassCommands;

        var j;
        var length = primitiveCommandList.length;
        for (j = 0; j < length; ++j) {
            var command = primitiveCommandList[j];

            var stencilPreloadCommand = stencilPreloadCommands[j];
            stencilPreloadCommand.modelMatrix = command.modelMatrix;
            stencilPreloadCommand.boundingVolume = command.boundingVolume;
            stencilPreloadCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var stencilDepthPassCommand = stencilDepthPassCommands[j];
            stencilDepthPassCommand.modelMatrix = command.modelMatrix;
            stencilDepthPassCommand.boundingVolume = command.boundingVolume;
            stencilDepthPassCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;

            var colorCommand = colorPassCommands[j];
            colorCommand.modelMatrix = command.modelMatrix;
            colorCommand.boundingVolume = command.boundingVolume;
            colorCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;
        }

        for (j = 0; j < length; ++j) {
            commandList.push(stencilPreloadCommands[j], stencilDepthPassCommands[j], colorPassCommands[j]);
        }
    };

    GroundPrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        return this._primitive.getGeometryInstanceAttributes(id);
    };

    GroundPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        this._sp = this._sp && this._sp.destroy();
    };

    return GroundPrimitive;
});