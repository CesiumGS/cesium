/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/BoundingRectangle',
        '../Core/RuntimeError',
        '../Core/WindingOrder',
        './CullFace',
        './DepthFunction',
        './BlendEquation',
        './BlendFunction',
        './StencilFunction',
        './StencilOperation'
    ], function(
        Color,
        defaultValue,
        DeveloperError,
        BoundingRectangle,
        RuntimeError,
        WindingOrder,
        CullFace,
        DepthFunction,
        BlendEquation,
        BlendFunction,
        StencilFunction,
        StencilOperation) {
    "use strict";

    /**
     * An immutable render state.  Do not create this directly.  See {@link Context#createRenderState}.
     *
     * @alias RenderState
     * @internalConstructor
     *
     * @see Context#createRenderState
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
            face : defaultValue(cull.face, CullFace.BACK)
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
            func : defaultValue(depthTest.func, DepthFunction.LESS) // func, because function is a JavaScript keyword
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
            equationRgb : defaultValue(blending.equationRgb, BlendEquation.ADD),
            equationAlpha : defaultValue(blending.equationAlpha, BlendEquation.ADD),
            functionSourceRgb : defaultValue(blending.functionSourceRgb, BlendFunction.ONE),
            functionSourceAlpha : defaultValue(blending.functionSourceAlpha, BlendFunction.ONE),
            functionDestinationRgb : defaultValue(blending.functionDestinationRgb, BlendFunction.ZERO),
            functionDestinationAlpha : defaultValue(blending.functionDestinationAlpha, BlendFunction.ZERO)
        };
        this.stencilTest = {
            enabled : defaultValue(stencilTest.enabled, false),
            frontFunction : defaultValue(stencilTest.frontFunction, StencilFunction.ALWAYS),
            backFunction : defaultValue(stencilTest.backFunction, StencilFunction.ALWAYS),
            reference : defaultValue(stencilTest.reference, 0),
            mask : defaultValue(stencilTest.mask, ~0),
            frontOperation : {
                fail : defaultValue(stencilTestFrontOperation.fail, StencilOperation.KEEP),
                zFail : defaultValue(stencilTestFrontOperation.zFail, StencilOperation.KEEP),
                zPass : defaultValue(stencilTestFrontOperation.zPass, StencilOperation.KEEP)
            },
            backOperation : {
                fail : defaultValue(stencilTestBackOperation.fail, StencilOperation.KEEP),
                zFail : defaultValue(stencilTestBackOperation.zFail, StencilOperation.KEEP),
                zPass : defaultValue(stencilTestBackOperation.zPass, StencilOperation.KEEP)
            }
        };
        this.sampleCoverage = {
            enabled : defaultValue(sampleCoverage.enabled, false),
            value : defaultValue(sampleCoverage.value, 1.0),
            invert : defaultValue(sampleCoverage.invert, false)
        };
        this.dither = defaultValue(rs.dither, true);
        this.viewport = (typeof viewport !== 'undefined') ? new BoundingRectangle(viewport.x, viewport.y,
            (typeof viewport.width === 'undefined') ? context.getCanvas().clientWidth : viewport.width,
            (typeof viewport.height === 'undefined') ? context.getCanvas().clientHeight : viewport.height) : undefined;

        // Validate

        if (!WindingOrder.validate(this.frontFace)) {
            throw new DeveloperError('Invalid renderState.frontFace.');
        }

        if (!CullFace.validate(this.cull.face)) {
            throw new DeveloperError('Invalid renderState.cull.face.');
        }

        if ((this.lineWidth < context.getMinimumAliasedLineWidth()) ||
            (this.lineWidth > context.getMaximumAliasedLineWidth())) {
            throw new RuntimeError('renderState.lineWidth is out of range.  Check getMinimumAliasedLineWidth() and getMaximumAliasedLineWidth().');
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

        if (!DepthFunction.validate(this.depthTest.func)) {
            throw new DeveloperError('Invalid renderState.depthTest.func.');
        }

        if ((this.blending.color.red < 0.0) || (this.blending.color.red > 1.0) ||
            (this.blending.color.green < 0.0) || (this.blending.color.green > 1.0) ||
            (this.blending.color.blue < 0.0) || (this.blending.color.blue > 1.0) ||
            (this.blending.color.alpha < 0.0) || (this.blending.color.alpha > 1.0)) {
            // Would be clamped by GL
            throw new DeveloperError('renderState.blending.color components must be greater than or equal to zero and less than or equal to one.');
        }

        if (!BlendEquation.validate(this.blending.equationRgb)) {
            throw new DeveloperError('Invalid renderState.blending.equationRgb.');
        }

        if (!BlendEquation.validate(this.blending.equationAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.equationAlpha.');
        }

        if (!BlendFunction.validate(this.blending.functionSourceRgb)) {
            throw new DeveloperError('Invalid renderState.blending.functionSourceRgb.');
        }

        if (!BlendFunction.validate(this.blending.functionSourceAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.functionSourceAlpha.');
        }

        if (!BlendFunction.validate(this.blending.functionDestinationRgb)) {
            throw new DeveloperError('Invalid renderState.blending.functionDestinationRgb.');
        }

        if (!BlendFunction.validate(this.blending.functionDestinationAlpha)) {
            throw new DeveloperError('Invalid renderState.blending.functionDestinationAlpha.');
        }

        if (!StencilFunction.validate(this.stencilTest.frontFunction)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontFunction.');
        }

        if (!StencilFunction.validate(this.stencilTest.backFunction)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backFunction.');
        }

        if (!StencilOperation.validate(this.stencilTest.frontOperation.fail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.fail.');
        }

        if (!StencilOperation.validate(this.stencilTest.frontOperation.zFail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.zFail.');
        }

        if (!StencilOperation.validate(this.stencilTest.frontOperation.zPass)) {
            throw new DeveloperError('Invalid renderState.stencilTest.frontOperation.zPass.');
        }

        if (!StencilOperation.validate(this.stencilTest.backOperation.fail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.fail.');
        }

        if (!StencilOperation.validate(this.stencilTest.backOperation.zFail)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.zFail.');
        }

        if (!StencilOperation.validate(this.stencilTest.backOperation.zPass)) {
            throw new DeveloperError('Invalid renderState.stencilTest.backOperation.zPass.');
        }

        if (typeof this.viewport !== 'undefined') {
            if (this.viewport.width < 0) {
                throw new DeveloperError('renderState.viewport.width must be greater than or equal to zero.');
            }

            if (this.viewport.width > context.getMaximumViewportWidth()) {
                throw new RuntimeError('renderState.viewport.width must be less than or equal to the maximum viewport width (' + this.getMaximumViewportWidth().toString() + ').  Check getMaximumViewportWidth().');
            }

            if (this.viewport.height < 0) {
                throw new DeveloperError('renderState.viewport.height must be greater than or equal to zero.');
            }

            if (this.viewport.height > context.getMaximumViewportHeight()) {
                throw new RuntimeError('renderState.viewport.height must be less than or equal to the maximum viewport height (' + this.getMaximumViewportHeight().toString() + ').  Check getMaximumViewportHeight().');
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
        var enabled = (typeof passState.scissorTest !== 'undefined') ? passState.scissorTest.enabled : scissorTest.enabled;

        enableOrDisable(gl, gl.SCISSOR_TEST, enabled);

        if (enabled) {
            var rectangle = (typeof passState.scissorTest !== 'undefined') ? passState.scissorTest.rectangle : scissorTest.rectangle;
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

    function applyBlending(gl, renderState, passState) {
        var blending = renderState.blending;
        var enabled = (typeof passState.blendingEnabled !== 'undefined') ? passState.blendingEnabled : blending.enabled;

        enableOrDisable(gl, gl.BLEND, enabled);

        if (enabled) {
            var color = blending.color;
            var equationRgb = blending.equationRgb;
            var equationAlpha = blending.equationAlpha;
            var functionSourceRgb = blending.functionSourceRgb;
            var functionDestinationRgb = blending.functionDestinationRgb;
            var functionSourceAlpha = blending.functionSourceAlpha;
            var functionDestinationAlpha = blending.functionDestinationAlpha;

            gl.blendColor(color.red, color.green, color.blue, color.alpha);
            gl.blendEquationSeparate(equationRgb, equationAlpha);
            gl.blendFuncSeparate(functionSourceRgb, functionDestinationRgb, functionSourceAlpha, functionDestinationAlpha);
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

    function applySampleCoverage(gl, renderState) {
        var sampleCoverage = renderState.sampleCoverage;
        var enabled = sampleCoverage.enabled;

        enableOrDisable(gl, gl.SAMPLE_COVERAGE, enabled);

        if (enabled) {
            gl.sampleCoverage(sampleCoverage.value, sampleCoverage.invert);
        }
    }

    function applyDither(gl, renderState) {
        enableOrDisable(gl, gl.DITHER, renderState.dither);
    }

    var scratchViewport = new BoundingRectangle();
    function applyViewport(gl, renderState, passState) {
        var viewport = renderState.viewport;

        if (typeof viewport === 'undefined') {
            var canvas = passState.context.getCanvas();
            viewport = scratchViewport;
            viewport.width = canvas.clientWidth;
            viewport.height = canvas.clientHeight;
        }

        passState.context.getUniformState().setViewport(viewport);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    }

    /**
     * @private
     */
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
        applyDither(gl, renderState);
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

        if (previousState.dither !== nextState.dither) {
            funcs.push(applyDither);
        }

        // For now, always apply because of passState
        funcs.push(applyViewport);

        return funcs;
    }

    /**
     * @private
     */
    RenderState.partialApply = function(gl, previousState, nextState, passState) {
        // When a new render state is applied, instead of making WebGL calls for all the states or first
        // comparing the states one-by-one with the previous state (basically a linear search), we take
        // advantage of RenderState's immutability, and store a dynamically populated sparse data structure
        // containing functions that make the minimum number of WebGL calls when transitioning from one state
        // to the other.  In practice, this works well since state-to-state transitions generally only require a
        // few WebGL calls, especially if commands are stored by state.
        var funcs = nextState._applyFunctions[previousState.id];
        if (typeof funcs === 'undefined') {
            funcs = createFuncs(previousState, nextState);
            nextState._applyFunctions[previousState.id] = funcs;
        }

        var len = funcs.length;
        for (var i = 0; i < len; ++i) {
            funcs[i](gl, nextState, passState);
        }
    };

    return RenderState;
});