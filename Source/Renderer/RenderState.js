/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/WebGLConstants',
        '../Core/WindingOrder',
        './ContextLimits'
    ], function(
        BoundingRectangle,
        Color,
        defaultValue,
        defined,
        DeveloperError,
        WebGLConstants,
        WindingOrder,
        ContextLimits) {
    'use strict';

    function validateBlendEquation(blendEquation) {
        return ((blendEquation === WebGLConstants.FUNC_ADD) ||
                (blendEquation === WebGLConstants.FUNC_SUBTRACT) ||
                (blendEquation === WebGLConstants.FUNC_REVERSE_SUBTRACT));
    }

    function validateBlendFunction(blendFunction) {
        return ((blendFunction === WebGLConstants.ZERO) ||
                (blendFunction === WebGLConstants.ONE) ||
                (blendFunction === WebGLConstants.SRC_COLOR) ||
                (blendFunction === WebGLConstants.ONE_MINUS_SRC_COLOR) ||
                (blendFunction === WebGLConstants.DST_COLOR) ||
                (blendFunction === WebGLConstants.ONE_MINUS_DST_COLOR) ||
                (blendFunction === WebGLConstants.SRC_ALPHA) ||
                (blendFunction === WebGLConstants.ONE_MINUS_SRC_ALPHA) ||
                (blendFunction === WebGLConstants.DST_ALPHA) ||
                (blendFunction === WebGLConstants.ONE_MINUS_DST_ALPHA) ||
                (blendFunction === WebGLConstants.CONSTANT_COLOR) ||
                (blendFunction === WebGLConstants.ONE_MINUS_CONSTANT_COLOR) ||
                (blendFunction === WebGLConstants.CONSTANT_ALPHA) ||
                (blendFunction === WebGLConstants.ONE_MINUS_CONSTANT_ALPHA) ||
                (blendFunction === WebGLConstants.SRC_ALPHA_SATURATE));
    }

    function validateCullFace(cullFace) {
        return ((cullFace === WebGLConstants.FRONT) ||
                (cullFace === WebGLConstants.BACK) ||
                (cullFace === WebGLConstants.FRONT_AND_BACK));
    }

    function validateDepthFunction(depthFunction) {
        return ((depthFunction === WebGLConstants.NEVER) ||
                (depthFunction === WebGLConstants.LESS) ||
                (depthFunction === WebGLConstants.EQUAL) ||
                (depthFunction === WebGLConstants.LEQUAL) ||
                (depthFunction === WebGLConstants.GREATER) ||
                (depthFunction === WebGLConstants.NOTEQUAL) ||
                (depthFunction === WebGLConstants.GEQUAL) ||
                (depthFunction === WebGLConstants.ALWAYS));
    }

    function validateStencilFunction (stencilFunction) {
        return ((stencilFunction === WebGLConstants.NEVER) ||
                (stencilFunction === WebGLConstants.LESS) ||
                (stencilFunction === WebGLConstants.EQUAL) ||
                (stencilFunction === WebGLConstants.LEQUAL) ||
                (stencilFunction === WebGLConstants.GREATER) ||
                (stencilFunction === WebGLConstants.NOTEQUAL) ||
                (stencilFunction === WebGLConstants.GEQUAL) ||
                (stencilFunction === WebGLConstants.ALWAYS));
    }

    function validateStencilOperation(stencilOperation) {
        return ((stencilOperation === WebGLConstants.ZERO) ||
                (stencilOperation === WebGLConstants.KEEP) ||
                (stencilOperation === WebGLConstants.REPLACE) ||
                (stencilOperation === WebGLConstants.INCR) ||
                (stencilOperation === WebGLConstants.DECR) ||
                (stencilOperation === WebGLConstants.INVERT) ||
                (stencilOperation === WebGLConstants.INCR_WRAP) ||
                (stencilOperation === WebGLConstants.DECR_WRAP));
    }

    /**
     * @private
     */
    function RenderState(renderState) {
        var rs = defaultValue(renderState, {});
        var cull = defaultValue(rs.cull, {});
        var polygonOffset = defaultValue(rs.polygonOffset, {});
        var scissorTest = defaultValue(rs.scissorTest, {});
        var scissorTestRectangle = defaultValue(scissorTest.rectangle, {});
        var depthRange = defaultValue(rs.depthRange, {});
        var depthTest = defaultValue(rs.depthTest, {});
        var colorMask = defaultValue(rs.colorMask, {});
        var blending = defaultValue(rs.blending, {});
        var blendingColor = defaultValue(blending.color, {});
        var stencilTest = defaultValue(rs.stencilTest, {});
        var stencilTestFrontOperation = defaultValue(stencilTest.frontOperation, {});
        var stencilTestBackOperation = defaultValue(stencilTest.backOperation, {});
        var sampleCoverage = defaultValue(rs.sampleCoverage, {});
        var viewport = rs.viewport;

        this.frontFace = defaultValue(rs.frontFace, WindingOrder.COUNTER_CLOCKWISE);
        this.cull = {
            enabled : defaultValue(cull.enabled, false),
            face : defaultValue(cull.face, WebGLConstants.BACK)
        };
        this.lineWidth = defaultValue(rs.lineWidth, 1.0);
        this.polygonOffset = {
            enabled : defaultValue(polygonOffset.enabled, false),
            factor : defaultValue(polygonOffset.factor, 0),
            units : defaultValue(polygonOffset.units, 0)
        };
        this.scissorTest = {
            enabled : defaultValue(scissorTest.enabled, false),
            rectangle : BoundingRectangle.clone(scissorTestRectangle)
        };
        this.depthRange = {
            near : defaultValue(depthRange.near, 0),
            far : defaultValue(depthRange.far, 1)
        };
        this.depthTest = {
            enabled : defaultValue(depthTest.enabled, false),
            func : defaultValue(depthTest.func, WebGLConstants.LESS) // func, because function is a JavaScript keyword
        };
        this.colorMask = {
            red : defaultValue(colorMask.red, true),
            green : defaultValue(colorMask.green, true),
            blue : defaultValue(colorMask.blue, true),
            alpha : defaultValue(colorMask.alpha, true)
        };
        this.depthMask = defaultValue(rs.depthMask, true);
        this.stencilMask = defaultValue(rs.stencilMask, ~0);
        this.blending = {
            enabled : defaultValue(blending.enabled, false),
            color : new Color(
                defaultValue(blendingColor.red, 0.0),
                defaultValue(blendingColor.green, 0.0),
                defaultValue(blendingColor.blue, 0.0),
                defaultValue(blendingColor.alpha, 0.0)
            ),
            equationRgb : defaultValue(blending.equationRgb, WebGLConstants.FUNC_ADD),
            equationAlpha : defaultValue(blending.equationAlpha, WebGLConstants.FUNC_ADD),
            functionSourceRgb : defaultValue(blending.functionSourceRgb, WebGLConstants.ONE),
            functionSourceAlpha : defaultValue(blending.functionSourceAlpha, WebGLConstants.ONE),
            functionDestinationRgb : defaultValue(blending.functionDestinationRgb, WebGLConstants.ZERO),
            functionDestinationAlpha : defaultValue(blending.functionDestinationAlpha, WebGLConstants.ZERO)
        };
        this.stencilTest = {
            enabled : defaultValue(stencilTest.enabled, false),
            frontFunction : defaultValue(stencilTest.frontFunction, WebGLConstants.ALWAYS),
            backFunction : defaultValue(stencilTest.backFunction, WebGLConstants.ALWAYS),
            reference : defaultValue(stencilTest.reference, 0),
            mask : defaultValue(stencilTest.mask, ~0),
            frontOperation : {
                fail : defaultValue(stencilTestFrontOperation.fail, WebGLConstants.KEEP),
                zFail : defaultValue(stencilTestFrontOperation.zFail, WebGLConstants.KEEP),
                zPass : defaultValue(stencilTestFrontOperation.zPass, WebGLConstants.KEEP)
            },
            backOperation : {
                fail : defaultValue(stencilTestBackOperation.fail, WebGLConstants.KEEP),
                zFail : defaultValue(stencilTestBackOperation.zFail, WebGLConstants.KEEP),
                zPass : defaultValue(stencilTestBackOperation.zPass, WebGLConstants.KEEP)
            }
        };
        this.sampleCoverage = {
            enabled : defaultValue(sampleCoverage.enabled, false),
            value : defaultValue(sampleCoverage.value, 1.0),
            invert : defaultValue(sampleCoverage.invert, false)
        };
        this.viewport = (defined(viewport)) ? new BoundingRectangle(viewport.x, viewport.y, viewport.width, viewport.height) : undefined;

        //>>includeStart('debug', pragmas.debug);
        if ((this.lineWidth < ContextLimits.minimumAliasedLineWidth) ||
                (this.lineWidth > ContextLimits.maximumAliasedLineWidth)) {
                throw new DeveloperError('renderState.lineWidth is out of range.  Check minimumAliasedLineWidth and maximumAliasedLineWidth.');
        }
        if (!WindingOrder.validate(this.frontFace)) {
            throw new DeveloperError('Invalid renderState.frontFace.');
        }
        if (!validateCullFace(this.cull.face)) {
            throw new DeveloperError('Invalid renderState.cull.face.');
        }
        if ((this.scissorTest.rectangle.width < 0) ||
            (this.scissorTest.rectangle.height < 0)) {
            throw new DeveloperError('renderState.scissorTest.rectangle.width and renderState.scissorTest.rectangle.height must be greater than or equal to zero.');
        }
        if (this.depthRange.near > this.depthRange.far) {
            // WebGL specific - not an error in GL ES
            throw new DeveloperError('renderState.depthRange.near can not be greater than renderState.depthRange.far.');
        }
        if (this.depthRange.near < 0) {
            // Would be clamped by GL
            throw new DeveloperError('renderState.depthRange.near must be greater than or equal to zero.');
        }
        if (this.depthRange.far > 1) {
            // Would be clamped by GL
            throw new DeveloperError('renderState.depthRange.far must be less than or equal to one.');
        }
        if (!validateDepthFunction(this.depthTest.func)) {
            throw new DeveloperError('Invalid renderState.depthTest.func.');
        }
        if ((this.blending.color.red < 0.0) || (this.blending.color.red > 1.0) ||
            (this.blending.color.green < 0.0) || (this.blending.color.green > 1.0) ||
            (this.blending.color.blue < 0.0) || (this.blending.color.blue > 1.0) ||
            (this.blending.color.alpha < 0.0) || (this.blending.color.alpha > 1.0)) {
            // Would be clamped by GL
            throw new DeveloperError('renderState.blending.color components must be greater than or equal to zero and less than or equal to one.');
        }
        if (!validateBlendEquation(this.blending.equationRgb)) {
            throw new DeveloperError('Invalid renderState.blending.equationRgb.');
        }
        if (!validateBlendEquation(this.blending.equationAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.equationAlpha.');
        }
        if (!validateBlendFunction(this.blending.functionSourceRgb)) {
            throw new DeveloperError('Invalid renderState.blending.functionSourceRgb.');
        }
        if (!validateBlendFunction(this.blending.functionSourceAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.functionSourceAlpha.');
        }
        if (!validateBlendFunction(this.blending.functionDestinationRgb)) {
            throw new DeveloperError('Invalid renderState.blending.functionDestinationRgb.');
        }
        if (!validateBlendFunction(this.blending.functionDestinationAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.functionDestinationAlpha.');
        }
        if (!validateStencilFunction(this.stencilTest.frontFunction)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontFunction.');
        }
        if (!validateStencilFunction(this.stencilTest.backFunction)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backFunction.');
        }
        if (!validateStencilOperation(this.stencilTest.frontOperation.fail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.fail.');
        }
        if (!validateStencilOperation(this.stencilTest.frontOperation.zFail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.zFail.');
        }
        if (!validateStencilOperation(this.stencilTest.frontOperation.zPass)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.zPass.');
        }
        if (!validateStencilOperation(this.stencilTest.backOperation.fail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.fail.');
        }
        if (!validateStencilOperation(this.stencilTest.backOperation.zFail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.zFail.');
        }
        if (!validateStencilOperation(this.stencilTest.backOperation.zPass)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.zPass.');
        }

        if (defined(this.viewport)) {
            if (this.viewport.width < 0) {
                throw new DeveloperError('renderState.viewport.width must be greater than or equal to zero.');
            }
            if (this.viewport.height < 0) {
                throw new DeveloperError('renderState.viewport.height must be greater than or equal to zero.');
            }

            if (this.viewport.width > ContextLimits.maximumViewportWidth) {
                throw new DeveloperError('renderState.viewport.width must be less than or equal to the maximum viewport width (' + ContextLimits.maximumViewportWidth.toString() + ').  Check maximumViewportWidth.');
            }
            if (this.viewport.height > ContextLimits.maximumViewportHeight) {
                throw new DeveloperError('renderState.viewport.height must be less than or equal to the maximum viewport height (' + ContextLimits.maximumViewportHeight.toString() + ').  Check maximumViewportHeight.');
            }
        }
        //>>includeEnd('debug');

        this.id = 0;
        this._applyFunctions = [];
    }

    var nextRenderStateId = 0;
    var renderStateCache = {};

    /**
     * Validates and then finds or creates an immutable render state, which defines the pipeline
     * state for a {@link DrawCommand} or {@link ClearCommand}.  All inputs states are optional.  Omitted states
     * use the defaults shown in the example below.
     *
     * @param {Object} [renderState] The states defining the render state as shown in the example below.
     *
     * @exception {RuntimeError} renderState.lineWidth is out of range.
     * @exception {DeveloperError} Invalid renderState.frontFace.
     * @exception {DeveloperError} Invalid renderState.cull.face.
     * @exception {DeveloperError} scissorTest.rectangle.width and scissorTest.rectangle.height must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.depthRange.near can't be greater than renderState.depthRange.far.
     * @exception {DeveloperError} renderState.depthRange.near must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.depthRange.far must be less than or equal to zero.
     * @exception {DeveloperError} Invalid renderState.depthTest.func.
     * @exception {DeveloperError} renderState.blending.color components must be greater than or equal to zero and less than or equal to one
     * @exception {DeveloperError} Invalid renderState.blending.equationRgb.
     * @exception {DeveloperError} Invalid renderState.blending.equationAlpha.
     * @exception {DeveloperError} Invalid renderState.blending.functionSourceRgb.
     * @exception {DeveloperError} Invalid renderState.blending.functionSourceAlpha.
     * @exception {DeveloperError} Invalid renderState.blending.functionDestinationRgb.
     * @exception {DeveloperError} Invalid renderState.blending.functionDestinationAlpha.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontFunction.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backFunction.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.fail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.zFail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.zPass.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.fail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.zFail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.zPass.
     * @exception {DeveloperError} renderState.viewport.width must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.viewport.width must be less than or equal to the maximum viewport width.
     * @exception {DeveloperError} renderState.viewport.height must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.viewport.height must be less than or equal to the maximum viewport height.
     *
     *
     * @example
     * var defaults = {
     *     frontFace : WindingOrder.COUNTER_CLOCKWISE,
     *     cull : {
     *         enabled : false,
     *         face : CullFace.BACK
     *     },
     *     lineWidth : 1,
     *     polygonOffset : {
     *         enabled : false,
     *         factor : 0,
     *         units : 0
     *     },
     *     scissorTest : {
     *         enabled : false,
     *         rectangle : {
     *             x : 0,
     *             y : 0,
     *             width : 0,
     *             height : 0
     *         }
     *     },
     *     depthRange : {
     *         near : 0,
     *         far : 1
     *     },
     *     depthTest : {
     *         enabled : false,
     *         func : DepthFunction.LESS
     *      },
     *     colorMask : {
     *         red : true,
     *         green : true,
     *         blue : true,
     *         alpha : true
     *     },
     *     depthMask : true,
     *     stencilMask : ~0,
     *     blending : {
     *         enabled : false,
     *         color : {
     *             red : 0.0,
     *             green : 0.0,
     *             blue : 0.0,
     *             alpha : 0.0
     *         },
     *         equationRgb : BlendEquation.ADD,
     *         equationAlpha : BlendEquation.ADD,
     *         functionSourceRgb : BlendFunction.ONE,
     *         functionSourceAlpha : BlendFunction.ONE,
     *         functionDestinationRgb : BlendFunction.ZERO,
     *         functionDestinationAlpha : BlendFunction.ZERO
     *     },
     *     stencilTest : {
     *         enabled : false,
     *         frontFunction : StencilFunction.ALWAYS,
     *         backFunction : StencilFunction.ALWAYS,
     *         reference : 0,
     *         mask : ~0,
     *         frontOperation : {
     *             fail : StencilOperation.KEEP,
     *             zFail : StencilOperation.KEEP,
     *             zPass : StencilOperation.KEEP
     *         },
     *         backOperation : {
     *             fail : StencilOperation.KEEP,
     *             zFail : StencilOperation.KEEP,
     *             zPass : StencilOperation.KEEP
     *         }
     *     },
     *     sampleCoverage : {
     *         enabled : false,
     *         value : 1.0,
     *         invert : false
     *      }
     * };
     *
     * var rs = RenderState.fromCache(defaults);
     *
     * @see DrawCommand
     * @see ClearCommand
     *
     * @private
     */
    RenderState.fromCache = function(renderState) {
        var partialKey = JSON.stringify(renderState);
        var cachedState = renderStateCache[partialKey];
        if (defined(cachedState)) {
            ++cachedState.referenceCount;
            return cachedState.state;
        }

        // Cache miss.  Fully define render state and try again.
        var states = new RenderState(renderState);
        var fullKey = JSON.stringify(states);
        cachedState = renderStateCache[fullKey];
        if (!defined(cachedState)) {
            states.id = nextRenderStateId++;

            cachedState = {
                referenceCount : 0,
                state : states
            };

            // Cache full render state.  Multiple partially defined render states may map to this.
            renderStateCache[fullKey] = cachedState;
        }

        ++cachedState.referenceCount;

        // Cache partial render state so we can skip validation on a cache hit for a partially defined render state
        renderStateCache[partialKey] = {
            referenceCount : 1,
            state : cachedState.state
        };

        return cachedState.state;
    };

    /**
     * @private
     */
    RenderState.removeFromCache = function(renderState) {
        var states = new RenderState(renderState);
        var fullKey = JSON.stringify(states);
        var fullCachedState = renderStateCache[fullKey];

        // decrement partial key reference count
        var partialKey = JSON.stringify(renderState);
        var cachedState = renderStateCache[partialKey];
        if (defined(cachedState)) {
            --cachedState.referenceCount;

            if (cachedState.referenceCount === 0) {
                // remove partial key
                delete renderStateCache[partialKey];

                // decrement full key reference count
                if (defined(fullCachedState)) {
                    --fullCachedState.referenceCount;
                }
            }
        }

        // remove full key if reference count is zero
        if (defined(fullCachedState) && (fullCachedState.referenceCount === 0)) {
            delete renderStateCache[fullKey];
        }
    };

    /**
     * This function is for testing purposes only.
     * @private
     */
    RenderState.getCache = function() {
        return renderStateCache;
    };

    /**
     * This function is for testing purposes only.
     * @private
     */
    RenderState.clearCache = function() {
        renderStateCache = {};
    };

    function enableOrDisable(gl, glEnum, enable) {
        if (enable) {
            gl.enable(glEnum);
        } else {
            gl.disable(glEnum);
        }
    }

    function applyFrontFace(gl, renderState) {
        gl.frontFace(renderState.frontFace);
    }

    function applyCull(gl, renderState) {
        var cull = renderState.cull;
        var enabled = cull.enabled;

        enableOrDisable(gl, gl.CULL_FACE, enabled);

        if (enabled) {
            gl.cullFace(cull.face);
        }
    }

    function applyLineWidth(gl, renderState) {
        gl.lineWidth(renderState.lineWidth);
    }

    function applyPolygonOffset(gl, renderState) {
        var polygonOffset = renderState.polygonOffset;
        var enabled = polygonOffset.enabled;

        enableOrDisable(gl, gl.POLYGON_OFFSET_FILL, enabled);

        if (enabled) {
            gl.polygonOffset(polygonOffset.factor, polygonOffset.units);
        }
    }

    function applyScissorTest(gl, renderState, passState) {
        var scissorTest = renderState.scissorTest;
        var enabled = (defined(passState.scissorTest)) ? passState.scissorTest.enabled : scissorTest.enabled;

        enableOrDisable(gl, gl.SCISSOR_TEST, enabled);

        if (enabled) {
            var rectangle = (defined(passState.scissorTest)) ? passState.scissorTest.rectangle : scissorTest.rectangle;
            gl.scissor(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        }
    }

    function applyDepthRange(gl, renderState) {
        var depthRange = renderState.depthRange;
        gl.depthRange(depthRange.near, depthRange.far);
    }

    function applyDepthTest(gl, renderState) {
        var depthTest = renderState.depthTest;
        var enabled = depthTest.enabled;

        enableOrDisable(gl, gl.DEPTH_TEST, enabled);

        if (enabled) {
            gl.depthFunc(depthTest.func);
        }
    }

    function applyColorMask(gl, renderState) {
        var colorMask = renderState.colorMask;
        gl.colorMask(colorMask.red, colorMask.green, colorMask.blue, colorMask.alpha);
    }

    function applyDepthMask(gl, renderState) {
        gl.depthMask(renderState.depthMask);
    }

    function applyStencilMask(gl, renderState) {
        gl.stencilMask(renderState.stencilMask);
    }

    function applyBlendingColor(gl, color) {
        gl.blendColor(color.red, color.green, color.blue, color.alpha);
    }

    function applyBlending(gl, renderState, passState) {
        var blending = renderState.blending;
        var enabled = (defined(passState.blendingEnabled)) ? passState.blendingEnabled : blending.enabled;

        enableOrDisable(gl, gl.BLEND, enabled);

        if (enabled) {
            applyBlendingColor(gl, blending.color);
            gl.blendEquationSeparate(blending.equationRgb, blending.equationAlpha);
            gl.blendFuncSeparate(blending.functionSourceRgb, blending.functionDestinationRgb, blending.functionSourceAlpha, blending.functionDestinationAlpha);
        }
    }

    function applyStencilTest(gl, renderState) {
        var stencilTest = renderState.stencilTest;
        var enabled = stencilTest.enabled;

        enableOrDisable(gl, gl.STENCIL_TEST, enabled);

        if (enabled) {
            var frontFunction = stencilTest.frontFunction;
            var backFunction = stencilTest.backFunction;
            var reference = stencilTest.reference;
            var mask = stencilTest.mask;

            // Section 6.8 of the WebGL spec requires the reference and masks to be the same for
            // front- and back-face tests.  This call prevents invalid operation errors when calling
            // stencilFuncSeparate on Firefox.  Perhaps they should delay validation to avoid requiring this.
            gl.stencilFunc(frontFunction, reference, mask);
            gl.stencilFuncSeparate(gl.BACK, backFunction, reference, mask);
            gl.stencilFuncSeparate(gl.FRONT, frontFunction, reference, mask);

            var frontOperation = stencilTest.frontOperation;
            var frontOperationFail = frontOperation.fail;
            var frontOperationZFail = frontOperation.zFail;
            var frontOperationZPass = frontOperation.zPass;

            gl.stencilOpSeparate(gl.FRONT, frontOperationFail, frontOperationZFail, frontOperationZPass);

            var backOperation = stencilTest.backOperation;
            var backOperationFail = backOperation.fail;
            var backOperationZFail = backOperation.zFail;
            var backOperationZPass = backOperation.zPass;

            gl.stencilOpSeparate(gl.BACK, backOperationFail, backOperationZFail, backOperationZPass);
        }
    }

    function applySampleCoverage(gl, renderState) {
        var sampleCoverage = renderState.sampleCoverage;
        var enabled = sampleCoverage.enabled;

        enableOrDisable(gl, gl.SAMPLE_COVERAGE, enabled);

        if (enabled) {
            gl.sampleCoverage(sampleCoverage.value, sampleCoverage.invert);
        }
    }

    var scratchViewport = new BoundingRectangle();
    function applyViewport(gl, renderState, passState) {
        var viewport = defaultValue(renderState.viewport, passState.viewport);
        if (!defined(viewport)) {
            viewport = scratchViewport;
            viewport.width = passState.context.drawingBufferWidth;
            viewport.height = passState.context.drawingBufferHeight;
        }

        passState.context.uniformState.viewport = viewport;
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    }

    RenderState.apply = function(gl, renderState, passState) {
        applyFrontFace(gl, renderState);
        applyCull(gl, renderState);
        applyLineWidth(gl, renderState);
        applyPolygonOffset(gl, renderState);
        applyDepthRange(gl, renderState);
        applyDepthTest(gl, renderState);
        applyColorMask(gl, renderState);
        applyDepthMask(gl, renderState);
        applyStencilMask(gl, renderState);
        applyStencilTest(gl, renderState);
        applySampleCoverage(gl, renderState);
        applyScissorTest(gl, renderState, passState);
        applyBlending(gl, renderState, passState);
        applyViewport(gl, renderState, passState);
    };

    function createFuncs(previousState, nextState) {
        var funcs = [];

        if (previousState.frontFace !== nextState.frontFace) {
            funcs.push(applyFrontFace);
        }

        if ((previousState.cull.enabled !== nextState.cull.enabled) || (previousState.cull.face !== nextState.cull.face)) {
            funcs.push(applyCull);
        }

        if (previousState.lineWidth !== nextState.lineWidth) {
            funcs.push(applyLineWidth);
        }

        if ((previousState.polygonOffset.enabled !== nextState.polygonOffset.enabled) ||
                (previousState.polygonOffset.factor !== nextState.polygonOffset.factor) ||
                (previousState.polygonOffset.units !== nextState.polygonOffset.units)) {
            funcs.push(applyPolygonOffset);
        }

        if ((previousState.depthRange.near !== nextState.depthRange.near) || (previousState.depthRange.far !== nextState.depthRange.far)) {
            funcs.push(applyDepthRange);
        }

        if ((previousState.depthTest.enabled !== nextState.depthTest.enabled) || (previousState.depthTest.func !== nextState.depthTest.func)) {
            funcs.push(applyDepthTest);
        }

        if ((previousState.colorMask.red !== nextState.colorMask.red) ||
                (previousState.colorMask.green !== nextState.colorMask.green) ||
                (previousState.colorMask.blue !== nextState.colorMask.blue) ||
                (previousState.colorMask.alpha !== nextState.colorMask.alpha)) {
            funcs.push(applyColorMask);
        }

        if (previousState.depthMask !== nextState.depthMask) {
            funcs.push(applyDepthMask);
        }

        if (previousState.stencilMask !== nextState.stencilMask) {
            funcs.push(applyStencilMask);
        }

        if ((previousState.stencilTest.enabled !== nextState.stencilTest.enabled) ||
                (previousState.stencilTest.frontFunction !== nextState.stencilTest.frontFunction) ||
                (previousState.stencilTest.backFunction !== nextState.stencilTest.backFunction) ||
                (previousState.stencilTest.reference !== nextState.stencilTest.reference) ||
                (previousState.stencilTest.mask !== nextState.stencilTest.mask) ||
                (previousState.stencilTest.frontOperation.fail !== nextState.stencilTest.frontOperation.fail) ||
                (previousState.stencilTest.frontOperation.zFail !== nextState.stencilTest.frontOperation.zFail) ||
                (previousState.stencilTest.backOperation.fail !== nextState.stencilTest.backOperation.fail) ||
                (previousState.stencilTest.backOperation.zFail !== nextState.stencilTest.backOperation.zFail) ||
                (previousState.stencilTest.backOperation.zPass !== nextState.stencilTest.backOperation.zPass)) {
            funcs.push(applyStencilTest);
        }

        if ((previousState.sampleCoverage.enabled !== nextState.sampleCoverage.enabled) ||
                (previousState.sampleCoverage.value !== nextState.sampleCoverage.value) ||
                (previousState.sampleCoverage.invert !== nextState.sampleCoverage.invert)) {
            funcs.push(applySampleCoverage);
        }

        return funcs;
    }

    RenderState.partialApply = function(gl, previousRenderState, renderState, previousPassState, passState, clear) {
        if (previousRenderState !== renderState) {
            // When a new render state is applied, instead of making WebGL calls for all the states or first
            // comparing the states one-by-one with the previous state (basically a linear search), we take
            // advantage of RenderState's immutability, and store a dynamically populated sparse data structure
            // containing functions that make the minimum number of WebGL calls when transitioning from one state
            // to the other.  In practice, this works well since state-to-state transitions generally only require a
            // few WebGL calls, especially if commands are stored by state.
            var funcs = renderState._applyFunctions[previousRenderState.id];
            if (!defined(funcs)) {
                funcs = createFuncs(previousRenderState, renderState);
                renderState._applyFunctions[previousRenderState.id] = funcs;
            }

            var len = funcs.length;
            for (var i = 0; i < len; ++i) {
                funcs[i](gl, renderState);
            }
        }

        var previousScissorTest = (defined(previousPassState.scissorTest)) ? previousPassState.scissorTest : previousRenderState.scissorTest;
        var scissorTest = (defined(passState.scissorTest)) ? passState.scissorTest : renderState.scissorTest;

        // Our scissor rectangle can get out of sync with the GL scissor rectangle on clears.
        // Seems to be a problem only on ANGLE. See https://github.com/AnalyticalGraphicsInc/cesium/issues/2994
        if ((previousScissorTest !== scissorTest) || clear) {
            applyScissorTest(gl, renderState, passState);
        }

        var previousBlendingEnabled = (defined(previousPassState.blendingEnabled)) ? previousPassState.blendingEnabled : previousRenderState.blending.enabled;
        var blendingEnabled = (defined(passState.blendingEnabled)) ? passState.blendingEnabled : renderState.blending.enabled;
        if ((previousBlendingEnabled !== blendingEnabled) ||
                (blendingEnabled && (previousRenderState.blending !== renderState.blending))) {
            applyBlending(gl, renderState, passState);
        }

        if (previousRenderState !== renderState || previousPassState !== passState || previousPassState.context !== passState.context) {
            applyViewport(gl, renderState, passState);
        }
    };

    RenderState.getState = function(renderState) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(renderState)) {
            throw new DeveloperError('renderState is required.');
        }
        //>>includeEnd('debug');

        return {
            frontFace : renderState.frontFace,
            cull : {
                enabled : renderState.cull.enabled,
                face : renderState.cull.face
            },
            lineWidth : renderState.lineWidth,
            polygonOffset : {
                enabled : renderState.polygonOffset.enabled,
                factor : renderState.polygonOffset.factor,
                units : renderState.polygonOffset.units
            },
            scissorTest : {
                enabled : renderState.scissorTest.enabled,
                rectangle : BoundingRectangle.clone(renderState.scissorTest.rectangle)
            },
            depthRange : {
                near : renderState.depthRange.near,
                far : renderState.depthRange.far
            },
            depthTest : {
                enabled : renderState.depthTest.enabled,
                func : renderState.depthTest.func
            },
            colorMask : {
                red : renderState.colorMask.red,
                green : renderState.colorMask.green,
                blue : renderState.colorMask.blue,
                alpha : renderState.colorMask.alpha
            },
            depthMask : renderState.depthMask,
            stencilMask : renderState.stencilMask,
            blending : {
                enabled : renderState.blending.enabled,
                color : Color.clone(renderState.blending.color),
                equationRgb : renderState.blending.equationRgb,
                equationAlpha : renderState.blending.equationAlpha,
                functionSourceRgb : renderState.blending.functionSourceRgb,
                functionSourceAlpha : renderState.blending.functionSourceAlpha,
                functionDestinationRgb : renderState.blending.functionDestinationRgb,
                functionDestinationAlpha : renderState.blending.functionDestinationAlpha
            },
            stencilTest : {
                enabled : renderState.stencilTest.enabled,
                frontFunction : renderState.stencilTest.frontFunction,
                backFunction : renderState.stencilTest.backFunction,
                reference : renderState.stencilTest.reference,
                mask : renderState.stencilTest.mask,
                frontOperation : {
                    fail : renderState.stencilTest.frontOperation.fail,
                    zFail : renderState.stencilTest.frontOperation.zFail,
                    zPass : renderState.stencilTest.frontOperation.zPass
                },
                backOperation : {
                    fail : renderState.stencilTest.backOperation.fail,
                    zFail : renderState.stencilTest.backOperation.zFail,
                    zPass : renderState.stencilTest.backOperation.zPass
                }
            },
            sampleCoverage : {
                enabled : renderState.sampleCoverage.enabled,
                value : renderState.sampleCoverage.value,
                invert : renderState.sampleCoverage.invert
            },
            viewport : defined(renderState.viewport) ? BoundingRectangle.clone(renderState.viewport) : undefined
        };
    };

    return RenderState;
});
