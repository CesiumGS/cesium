/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/WindingOrder'
    ], function(
        BoundingRectangle,
        Color,
        defaultValue,
        defined,
        DeveloperError,
        RuntimeError,
        WindingOrder) {
    "use strict";
    /*global WebGLRenderingContext*/

    function validateBlendEquation(blendEquation) {
        return ((blendEquation === WebGLRenderingContext.FUNC_ADD) ||
                (blendEquation === WebGLRenderingContext.FUNC_SUBTRACT) ||
                (blendEquation === WebGLRenderingContext.FUNC_REVERSE_SUBTRACT));
    }

    function validateBlendFunction(blendFunction) {
        return ((blendFunction === WebGLRenderingContext.ZERO) ||
                (blendFunction === WebGLRenderingContext.ONE) ||
                (blendFunction === WebGLRenderingContext.SRC_COLOR) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_SRC_COLOR) ||
                (blendFunction === WebGLRenderingContext.DST_COLOR) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_DST_COLOR) ||
                (blendFunction === WebGLRenderingContext.SRC_ALPHA) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_SRC_ALPHA) ||
                (blendFunction === WebGLRenderingContext.DST_ALPHA) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_DST_ALPHA) ||
                (blendFunction === WebGLRenderingContext.CONSTANT_COLOR) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_CONSTANT_COLOR) ||
                (blendFunction === WebGLRenderingContext.CONSTANT_ALPHA) ||
                (blendFunction === WebGLRenderingContext.ONE_MINUS_CONSTANT_ALPHA) ||
                (blendFunction === WebGLRenderingContext.SRC_ALPHA_SATURATE));
    }

    function validateCullFace(cullFace) {
        return ((cullFace === WebGLRenderingContext.FRONT) ||
                (cullFace === WebGLRenderingContext.BACK) ||
                (cullFace === WebGLRenderingContext.FRONT_AND_BACK));
    }

    function validateDepthFunction(depthFunction) {
        return ((depthFunction === WebGLRenderingContext.NEVER) ||
                (depthFunction === WebGLRenderingContext.LESS) ||
                (depthFunction === WebGLRenderingContext.EQUAL) ||
                (depthFunction === WebGLRenderingContext.LEQUAL) ||
                (depthFunction === WebGLRenderingContext.GREATER) ||
                (depthFunction === WebGLRenderingContext.NOTEQUAL) ||
                (depthFunction === WebGLRenderingContext.GEQUAL) ||
                (depthFunction === WebGLRenderingContext.ALWAYS));
    }

    function validateStencilFunction (stencilFunction) {
        return ((stencilFunction === WebGLRenderingContext.NEVER) ||
                (stencilFunction === WebGLRenderingContext.LESS) ||
                (stencilFunction === WebGLRenderingContext.EQUAL) ||
                (stencilFunction === WebGLRenderingContext.LEQUAL) ||
                (stencilFunction === WebGLRenderingContext.GREATER) ||
                (stencilFunction === WebGLRenderingContext.NOTEQUAL) ||
                (stencilFunction === WebGLRenderingContext.GEQUAL) ||
                (stencilFunction === WebGLRenderingContext.ALWAYS));
    }

    function validateStencilOperation(stencilOperation) {
        return ((stencilOperation === WebGLRenderingContext.ZERO) ||
                (stencilOperation === WebGLRenderingContext.KEEP) ||
                (stencilOperation === WebGLRenderingContext.REPLACE) ||
                (stencilOperation === WebGLRenderingContext.INCR) ||
                (stencilOperation === WebGLRenderingContext.DECR) ||
                (stencilOperation === WebGLRenderingContext.INVERT) ||
                (stencilOperation === WebGLRenderingContext.INCREMENT_WRAP) ||
                (stencilOperation === WebGLRenderingContext.DECR_WRAP));
    }

    /**
     * @private
     */
    var RenderState = function(context, renderState) {
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
            face : defaultValue(cull.face, WebGLRenderingContext.BACK)
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
            func : defaultValue(depthTest.func, WebGLRenderingContext.LESS) // func, because function is a JavaScript keyword
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
            equationRgb : defaultValue(blending.equationRgb, WebGLRenderingContext.FUNC_ADD),
            equationAlpha : defaultValue(blending.equationAlpha, WebGLRenderingContext.FUNC_ADD),
            functionSourceRgb : defaultValue(blending.functionSourceRgb, WebGLRenderingContext.ONE),
            functionSourceAlpha : defaultValue(blending.functionSourceAlpha, WebGLRenderingContext.ONE),
            functionDestinationRgb : defaultValue(blending.functionDestinationRgb, WebGLRenderingContext.ZERO),
            functionDestinationAlpha : defaultValue(blending.functionDestinationAlpha, WebGLRenderingContext.ZERO)
        };
        this.stencilTest = {
            enabled : defaultValue(stencilTest.enabled, false),
            frontFunction : defaultValue(stencilTest.frontFunction, WebGLRenderingContext.ALWAYS),
            backFunction : defaultValue(stencilTest.backFunction, WebGLRenderingContext.ALWAYS),
            reference : defaultValue(stencilTest.reference, 0),
            mask : defaultValue(stencilTest.mask, ~0),
            frontOperation : {
                fail : defaultValue(stencilTestFrontOperation.fail, WebGLRenderingContext.KEEP),
                zFail : defaultValue(stencilTestFrontOperation.zFail, WebGLRenderingContext.KEEP),
                zPass : defaultValue(stencilTestFrontOperation.zPass, WebGLRenderingContext.KEEP)
            },
            backOperation : {
                fail : defaultValue(stencilTestBackOperation.fail, WebGLRenderingContext.KEEP),
                zFail : defaultValue(stencilTestBackOperation.zFail, WebGLRenderingContext.KEEP),
                zPass : defaultValue(stencilTestBackOperation.zPass, WebGLRenderingContext.KEEP)
            }
        };
        this.sampleCoverage = {
            enabled : defaultValue(sampleCoverage.enabled, false),
            value : defaultValue(sampleCoverage.value, 1.0),
            invert : defaultValue(sampleCoverage.invert, false)
        };
        this.viewport = (defined(viewport)) ? new BoundingRectangle(viewport.x, viewport.y,
            (!defined(viewport.width)) ? context.drawingBufferWidth : viewport.width,
            (!defined(viewport.height)) ? context.drawingBufferHeight : viewport.height) : undefined;

        if ((this.lineWidth < context.minimumAliasedLineWidth) ||
                (this.lineWidth > context.maximumAliasedLineWidth)) {
                throw new RuntimeError('renderState.lineWidth is out of range.  Check minimumAliasedLineWidth and maximumAliasedLineWidth.');
        }

        //>>includeStart('debug', pragmas.debug);
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
        //>>includeEnd('debug');

        if (defined(this.viewport)) {
            //>>includeStart('debug', pragmas.debug);
            if (this.viewport.width < 0) {
                throw new DeveloperError('renderState.viewport.width must be greater than or equal to zero.');
            }
            if (this.viewport.height < 0) {
                throw new DeveloperError('renderState.viewport.height must be greater than or equal to zero.');
            }
            //>>includeEnd('debug');

            if (this.viewport.width > context.maximumViewportWidth) {
                throw new RuntimeError('renderState.viewport.width must be less than or equal to the maximum viewport width (' + this.maximumViewportWidth.toString() + ').  Check maximumViewportWidth.');
            }
            if (this.viewport.height > context.maximumViewportHeight) {
                throw new RuntimeError('renderState.viewport.height must be less than or equal to the maximum viewport height (' + this.maximumViewportHeight.toString() + ').  Check maximumViewportHeight.');
            }
        }


        this.id = 0;
        this._applyFunctions = [];
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

    var applyBlendingColor = function(gl, color) {
        gl.blendColor(color.red, color.green, color.blue, color.alpha);
    };

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
            gl.stencilFunc(stencilTest.frontFunction, stencilTest.reference, stencilTest.mask);
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

    var applySampleCoverage = function(gl, renderState) {
        var sampleCoverage = renderState.sampleCoverage;
        var enabled = sampleCoverage.enabled;

        enableOrDisable(gl, gl.SAMPLE_COVERAGE, enabled);

        if (enabled) {
            gl.sampleCoverage(sampleCoverage.value, sampleCoverage.invert);
        }
    };

    var scratchViewport = new BoundingRectangle();
    function applyViewport(gl, renderState, passState) {
        var viewport = renderState.viewport;

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
        applyScissorTest(gl, renderState, passState);
        applyDepthRange(gl, renderState);
        applyDepthTest(gl, renderState);
        applyColorMask(gl, renderState);
        applyDepthMask(gl, renderState);
        applyStencilMask(gl, renderState);
        applyBlending(gl, renderState, passState);
        applyStencilTest(gl, renderState);
        applySampleCoverage(gl, renderState);
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

        // For now, always apply because of passState
        funcs.push(applyScissorTest);

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

        // For now, always apply because of passState
        funcs.push(applyBlending);

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

        // For now, always apply because of passState
        funcs.push(applyViewport);

        return funcs;
    }

    RenderState.partialApply = function(gl, previousState, nextState, passState) {
        // When a new render state is applied, instead of making WebGL calls for all the states or first
        // comparing the states one-by-one with the previous state (basically a linear search), we take
        // advantage of RenderState's immutability, and store a dynamically populated sparse data structure
        // containing functions that make the minimum number of WebGL calls when transitioning from one state
        // to the other.  In practice, this works well since state-to-state transitions generally only require a
        // few WebGL calls, especially if commands are stored by state.
        var funcs = nextState._applyFunctions[previousState.id];
        if (!defined(funcs)) {
            funcs = createFuncs(previousState, nextState);
            nextState._applyFunctions[previousState.id] = funcs;
        }

        var len = funcs.length;
        for (var i = 0; i < len; ++i) {
            funcs[i](gl, nextState, passState);
        }
    };

    /**
     * Duplicates a RenderState instance. The object returned must still be created with {@link Context#createRenderState}.
     *
     * @param renderState The render state to be cloned.
     * @returns {Object} The duplicated render state.
     */
    RenderState.clone = function(renderState) {
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