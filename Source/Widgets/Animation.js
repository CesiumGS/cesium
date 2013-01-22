/*global define*/
define([
    '../Core/DeveloperError',
    '../Core/ClockStep',
    '../Core/Color'
], function(
    DeveloperError,
    ClockStep,
    Color
) {
    "use strict";

    /**
     * <span style="display: block; text-align: center;">
     * <img src="images/AnimationWidget.png" width="211" height="142" alt="" style="border: none; border-radius: 5px;" />
     * <br />Animation widget
     * </span>
     * <br /><br />
     * The Animation widget manipulates an {@link AnimationController}.  It provides buttons for play, pause,
     * and reverse, along with the current time and date, surrounded by a "shuttle ring"
     * for controlling the speed of animation.
     * <br /><br />
     * The "shuttle ring" concept is borrowed from video editing, where typically a
     * "jog wheel" can be rotated to move past individual animation frames very slowly, and
     * a surrounding shuttle ring can be twisted to control direction and speed of fast playback.
     * Cesium typically treats time as continuous (not broken into pre-defined animation frames),
     * so this widget offers no jog wheel.  Instead, the shuttle ring is capable of both fast and
     * very slow playback.  Click and drag the shuttle ring pointer itself (shown above in green),
     * or click in the rest of the ring area to nudge the pointer to the next preset speed in that direction.
     * <br /><br />
     * The Animation widget also provides a "realtime" button (in the upper-left) that keeps
     * animation time in sync with the end user's system clock, typically displaying
     * "today" or "right now."  This mode is not available in {@link ClockRange.CLAMPED} or
     * {@link ClockRange.LOOP} mode if the current time is outside of {@link Clock}'s startTime and endTime.
     *
     * @alias Animation
     * @constructor
     *
     * @param {DOM Node} parentNode The parent HTML DOM node for this widget.
     * @param {AnimationController} animationController The animationController that will be manipulated by this widget.
     *
     * @see AnimationController
     * @see Clock
     *
     * @example
     * // In HTML head, include a link to Animation.css stylesheet,
     * // and in the body, include: &lt;div id="animationWidget"&gt;&lt;/div&gt;
     *
     * var clock = new Clock();
     * var animationController = new AnimationController(clock);
     * var parentNode = document.getElementById("animationWidget");
     * var widget = new Animation(parentNode, animationController);
     *
     * function tick() {
     *     animationController.update();
     *     widget.update();
     *     Cesium.requestAnimationFrame(tick);
     * }
     * Cesium.requestAnimationFrame(tick);
     */
    var Animation = function(parentNode, animationController) {
        this.parentNode = parentNode;
        this.animationController = animationController;
        if (typeof animationController !== 'object') {
            throw new DeveloperError('AnimationController parameter required to construct Animation widget.');
        }
        this.clock = animationController.clock;

        this._createNodes(parentNode);
    };

    Animation.prototype._svgNS = "http://www.w3.org/2000/svg";
    Animation.prototype._xlinkNS = "http://www.w3.org/1999/xlink";
    Animation.prototype._monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    Animation.prototype._svgSet = function (name, val) {
        this.setAttribute(name, val);
        return this;
    };

    Animation.prototype._svg = function (name) {
        var element = document.createElementNS(this._svgNS, name);
        element.set = Animation.prototype._svgSet;
        return element;
    };

    Animation.prototype._svgFromObject = function (obj) {
        var ele = this._svg(obj.tagName);
        for (var field in obj) {
            if (obj.hasOwnProperty(field) && field !== 'tagName') {
                if (field === 'children') {
                    var i, len = obj.children.length;
                    for (i = 0; i < len; ++i) {
                        ele.appendChild(this._svgFromObject(obj.children[i]));
                    }
                } else if (field.indexOf('xlink:') === 0) {
                    ele.setAttributeNS(this._xlinkNS, field.substring(6), obj[field]);
                } else if (field === 'textContent') {
                    ele.textContent = obj[field];
                } else {
                    ele.set(field, obj[field]);
                }
            }
        }
        return ele;
    };

    Animation.prototype._svgText = function(x, y, msg) {
        var text = this._svg('text').set('x', x).set('y', y).set('class', 'animation-svgText');
        var tspan = this._svg('tspan');
        tspan.textContent = msg;
        text.appendChild(tspan);
        return text;
    };

    Animation.prototype._updateSvgText = function(svgText, msg) {
        svgText.childNodes[0].textContent = msg;
    };

    Animation.prototype._maxShuttleAngle = 105;

    Animation.prototype._shuttleAngletoSpeed = function (angle) {
        if (Math.abs(angle) < 5) {
            return 0;
        }
        angle = Math.max(Math.min(angle, this._maxShuttleAngle), -this._maxShuttleAngle);
        var speed = Math.exp(((Math.abs(angle) - 15) * 0.15));
        if (speed > 10) {
            var scale = Math.pow(10, Math.floor((Math.log(speed) / Math.LN10) + 0.0001) - 1);
            speed = Math.round(Math.round(speed / scale) * scale);
        } else if (speed > 0.8) {
            speed = Math.round(speed);
        } else {
            speed = this.animationController.getTypicalSpeed(speed);
        }
        if (angle < 0) {
            speed *= -1.0;
        }
        return speed;
    };

    Animation.prototype._shuttleSpeedtoAngle = function (speed) {
        var angle = Math.log(Math.abs(speed)) / 0.15 + 15;
        angle = Math.max(Math.min(angle, this._maxShuttleAngle), 0);
        if (speed < 0) {
            angle *= -1.0;
        }
        return angle;
    };

    Animation.prototype._setShuttleRingPointer = function (angle) {
        this.shuttleRingPointer.setAttribute('transform', 'translate(100,100) rotate(' + angle + ')');
        this.knobOuter.setAttribute('transform', 'rotate(' + angle + ')');
    };

    Animation.prototype.gradientEnabledColor0 = Color.fromCssColorString('rgba(247,250,255,0.384)');
    Animation.prototype.gradientEnabledColor1 = Color.fromCssColorString('rgba(143,191,255,0.216)');
    Animation.prototype.gradientEnabledColor2 = Color.fromCssColorString('rgba(153,197,255,0.098)');
    Animation.prototype.gradientEnabledColor3 = Color.fromCssColorString('rgba(255,255,255,0.086)');

    Animation.prototype.gradientDisabledColor0 = Color.fromCssColorString('rgba(255,255,255,0.267)');
    Animation.prototype.gradientDisabledColor1 = Color.fromCssColorString('rgba(255,255,255,0)');

    Animation.prototype.gradientKnobColor = Color.fromCssColorString('rgba(66,67,68,0.3)');
    Animation.prototype.gradientPointerColor = Color.fromCssColorString('rgba(0,0,0,0.5)');

    Animation.prototype._makeColorString = function(background, gradient) {
        var gradientAlpha = gradient.alpha;
        var backgroundAlpha = 1.0 - gradientAlpha;
        var red = (background.red * backgroundAlpha) + (gradient.red * gradientAlpha);
        var green = (background.green * backgroundAlpha) + (gradient.green * gradientAlpha);
        var blue = (background.blue * backgroundAlpha) + (gradient.blue * gradientAlpha);
        return 'rgb(' + Math.round(red * 255) + ',' + Math.round(green * 255) + ',' +
            Math.round(blue * 255) + ')';
    };

    /**
     * Get the widget scale last set by {@link Animation#setScale}.
     *
     * @function
     * @memberof Animation.prototype
     * @returns {Number} : The scale of the widget.
     */
    Animation.prototype.getScale = function() {
        return this._scale;
    };

    /**
     * Adjust the overall size of the widget relative to the rest of the page.
     * The default scale is 1.0.
     *
     * @function
     * @memberof Animation.prototype
     * @param {Number} scale A size modifier for the widget UI
     */
    Animation.prototype.setScale = function(scale) {
        scale *= 0.85; // The default 1.0 scale is smaller than the native SVG as originally designed.
        this._scale = scale;
        this._centerX = Math.max(1, Math.floor(100 * scale));

        var svg = this.svgNode;
        var width = Math.max(2, Math.floor(200 * scale));
        var height = Math.max(2, Math.floor(132 * scale));

        svg.style.cssText = 'width: ' + width + 'px; height: ' + height + 'px; position: absolute; bottom: 0; left: 0;';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

        this._topG.set('transform', 'scale(' + scale + ')');
    };

    /**
     * Call this after changing the CSS rules that affect the color theme of the widget.
     * It updates the SVG gradients to match the new rules.
     *
     * @function
     * @memberof Animation.prototype
     */
    Animation.prototype.onThemeChanged = function() {
        var widget = this;
        var svg = this.svgNode;

        var buttonNormalBackColor = Color.fromCssColorString(window.getComputedStyle(widget._themeNormal).getPropertyValue('color'));
        var buttonHoverBackColor = Color.fromCssColorString(window.getComputedStyle(widget._themeHover).getPropertyValue('color'));
        var buttonSelectedBackColor = Color.fromCssColorString(window.getComputedStyle(widget._themeSelect).getPropertyValue('color'));
        var buttonDisabledBackColor = Color.fromCssColorString(window.getComputedStyle(widget._themeDisabled).getPropertyValue('color'));
        var knobBackColor = Color.fromCssColorString(window.getComputedStyle(widget._themeKnob).getPropertyValue('color'));
        var pointerColor = Color.fromCssColorString(window.getComputedStyle(widget._themePointer).getPropertyValue('color'));
        var swooshColor = Color.fromCssColorString(window.getComputedStyle(widget._themeSwoosh).getPropertyValue('color'));
        var swooshHoverColor = Color.fromCssColorString(window.getComputedStyle(widget._themeSwooshHover).getPropertyValue('color'));

        var defs = {
            'tagName' : 'defs',
            'children' : [
                {
                    'id' : 'animation_buttonNormal',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        //add a 'stop-opacity' field to make translucent.
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' :
                            widget._makeColorString(buttonNormalBackColor, widget.gradientEnabledColor0) },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' :
                            widget._makeColorString(buttonNormalBackColor, widget.gradientEnabledColor1) },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' :
                            widget._makeColorString(buttonNormalBackColor, widget.gradientEnabledColor2) },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' :
                            widget._makeColorString(buttonNormalBackColor, widget.gradientEnabledColor3) }
                    ]
                }, {
                    'id' : 'animation_buttonHovered',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' :
                            widget._makeColorString(buttonHoverBackColor, widget.gradientEnabledColor0) },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' :
                            widget._makeColorString(buttonHoverBackColor, widget.gradientEnabledColor1) },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' :
                            widget._makeColorString(buttonHoverBackColor, widget.gradientEnabledColor2) },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' :
                            widget._makeColorString(buttonHoverBackColor, widget.gradientEnabledColor3) }
                    ]
                }, {
                    'id' : 'animation_buttonSelected',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' :
                            widget._makeColorString(buttonSelectedBackColor, widget.gradientEnabledColor0) },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' :
                            widget._makeColorString(buttonSelectedBackColor, widget.gradientEnabledColor1) },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' :
                            widget._makeColorString(buttonSelectedBackColor, widget.gradientEnabledColor2) },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' :
                            widget._makeColorString(buttonSelectedBackColor, widget.gradientEnabledColor3) }
                    ]
                }, {
                    'id' : 'animation_buttonDisabled',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' :
                            widget._makeColorString(buttonDisabledBackColor, widget.gradientDisabledColor0) },
                        { 'tagName' : 'stop', 'offset' : '75%', 'stop-color' :
                            widget._makeColorString(buttonDisabledBackColor, widget.gradientDisabledColor1) }
                    ]
                }, {
                    'id' : 'animation_blurred',
                    'tagName' : 'filter',
                    'width' : '200%', 'height' : '200%', 'x' : '-50%', 'y' : '-50%',
                    'children' : [
                        {
                            'tagName' : 'feGaussianBlur',
                            'stdDeviation' : 4,
                            'in' : 'SourceGraphic'
                        }
                    ]
                }, {
                    'id' : 'animation_shuttleRingSwooshGradient',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-opacity' : 0.2, 'stop-color' :
                            swooshColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '85%', 'stop-opacity' : 0.85, 'stop-color' :
                            swooshColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '95%', 'stop-opacity' : 0.05, 'stop-color' :
                            swooshColor.toCssColorString() }
                    ]
                }, {
                    'id' : 'animation_shuttleRingSwooshHovered',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-opacity' : 0.2, 'stop-color' :
                            swooshHoverColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '85%', 'stop-opacity' : 0.85, 'stop-color' :
                            swooshHoverColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '95%', 'stop-opacity' : 0.05, 'stop-color' :
                            swooshHoverColor.toCssColorString() }
                    ]
                }, {
                    'id' : 'animation_shuttleRingPointerGradient',
                    'tagName' : 'linearGradient',
                    'x1' : '0%', 'y1' : '50%', 'x2' : '100%', 'y2' : '50%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' :
                            pointerColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '40%', 'stop-color' :
                            pointerColor.toCssColorString() },
                        { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' :
                            widget._makeColorString(pointerColor, widget.gradientPointerColor) },
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' :
                            widget._makeColorString(pointerColor, widget.gradientPointerColor) }
                    ]
                }, {
                    'id' : 'animation_shuttleRingPointerPaused',
                    'tagName' : 'linearGradient',
                    'x1' : '0%', 'y1' : '50%', 'x2' : '100%', 'y2' : '50%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#CCC' },
                        { 'tagName' : 'stop', 'offset' : '40%', 'stop-color' : '#CCC' },
                        { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' : '#555' },
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' : '#555' }
                    ]
                }, {
                    'id' : 'animation_knobOuter',
                    'tagName' : 'linearGradient',
                    'x1' : '20%', 'y1' : '0%', 'x2' : '90%', 'y2' : '100%',
                    'children' : [
                          { 'tagName' : 'stop', 'offset' : '5%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientEnabledColor0) },
                          { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientKnobColor) },
                          { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientEnabledColor1) }
                    ]
                }, {
                    'id' : 'animation_knobInner',
                    'tagName' : 'linearGradient',
                    'x1' : '20%', 'y1' : '0%', 'x2' : '90%', 'y2' : '100%',
                    'children' : [
                          { 'tagName' : 'stop', 'offset' : '5%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientKnobColor) },
                          { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientEnabledColor0) },
                          { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' :
                              widget._makeColorString(knobBackColor, widget.gradientEnabledColor3) }
                    ]
                }, {
                    'id' : 'animation_pathReset',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.316,5.318,9.833,13.682,9.833,5.5,5.5,5.5,5.5,25.5,9.833,25.5,9.833,17.318,24.316,25.682z'
                }, {
                    'id' : 'animation_pathPause',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M13,5.5,7.5,5.5,7.5,25.5,13,25.5zM24.5,5.5,19,5.5,19,25.5,24.5,25.5z'
                }, {
                    'id' : 'animation_pathPlay',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z'
                }, {
                    'id' : 'animation_pathPlayReverse',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(-0.85,0.85) translate(-16,-16)',
                    'd' : 'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z'
                }, {
                    'id' : 'animation_pathLoop',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.249,15.499c-0.009,4.832-3.918,8.741-8.75,8.75c-2.515,0-4.768-1.064-6.365-2.763l2.068-1.442l-7.901-3.703l0.744,8.694l2.193-1.529c2.244,2.594,5.562,4.242,9.26,4.242c6.767,0,12.249-5.482,12.249-12.249H24.249zM15.499,6.75c2.516,0,4.769,1.065,6.367,2.764l-2.068,1.443l7.901,3.701l-0.746-8.693l-2.192,1.529c-2.245-2.594-5.562-4.245-9.262-4.245C8.734,3.25,3.25,8.734,3.249,15.499H6.75C6.758,10.668,10.668,6.758,15.499,6.75z'
                }, {
                    'id' : 'animation_pathClock',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-15.5)',
                    'd' : 'M15.5,2.374C8.251,2.375,2.376,8.251,2.374,15.5C2.376,22.748,8.251,28.623,15.5,28.627c7.249-0.004,13.124-5.879,13.125-13.127C28.624,8.251,22.749,2.375,15.5,2.374zM15.5,25.623C9.909,25.615,5.385,21.09,5.375,15.5C5.385,9.909,9.909,5.384,15.5,5.374c5.59,0.01,10.115,4.535,10.124,10.125C25.615,21.09,21.091,25.615,15.5,25.623zM8.625,15.5c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,16.5,8.624,16.053,8.625,15.5zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.887,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM22.822,12.428c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,12.54,22.344,12.705,22.822,12.428zM12.062,21.455c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,22.344,12.54,21.732,12.062,21.455zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM22.823,18.572c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.092,0.367,1.367c0.477,0.275,1.089,0.113,1.365-0.365C23.464,19.461,23.3,18.848,22.823,18.572zM19.938,7.813c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM23.378,14.5c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,14.949,23.929,14.5,23.378,14.5zM15.501,6.624c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.365c0.275,0.479,0.889,0.643,1.365,0.367l3.305-1.676C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876C16.501,7.072,16.053,6.624,15.501,6.624zM15.501,22.377c-0.552,0-1,0.447-1,1s0.448,1,1,1s1-0.447,1-1S16.053,22.377,15.501,22.377zM18.939,21.455c-0.479,0.277-0.643,0.889-0.366,1.367c0.275,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.889,0.366-1.365C20.028,21.344,19.417,21.18,18.939,21.455z'
                }, {
                    'id' : 'animation_pathWingButton',
                    'tagName' : 'path',
                    'd' : 'm 4.5,0.5 c -2.216,0 -4,1.784 -4,4 l 0,24 c 0,2.216 1.784,4 4,4 l 13.71875,0 C 22.478584,27.272785 27.273681,22.511272 32.5,18.25 l 0,-13.75 c 0,-2.216 -1.784,-4 -4,-4 l -24,0 z'
                }, {
                    'id' : 'animation_pathPointer',
                    'tagName' : 'path',
                    'd' : 'M-15,-65,-15,-55,15,-55,15,-65,0,-95z'
                }, {
                    'id' : 'animation_pathSwooshFX',
                    'tagName' : 'path',
                    'd' : 'm 85,0 c 0,16.617 -4.813944,35.356 -13.131081,48.4508 h 6.099803 c 8.317138,-13.0948 13.13322,-28.5955 13.13322,-45.2124 0,-46.94483 -38.402714,-85.00262 -85.7743869,-85.00262 -1.0218522,0 -2.0373001,0.0241 -3.0506131,0.0589 45.958443,1.59437 82.723058,35.77285 82.723058,81.70532 z'
                }
            ]
        };

        var defsElement = this._svgFromObject(defs);
        if (typeof widget._defsElement === 'undefined') {
            svg.appendChild(defsElement);
        } else {
            svg.replaceChild(defsElement, widget._defsElement);
        }
        widget._defsElement = defsElement;
    };

    Animation.prototype._createNodes = function(parentNode) {
        var widget = this;

        // Firefox requires SVG references to be included directly, not imported from external CSS.
        // Also, CSS minifiers get confused by this being in an external CSS file.
        var cssStyle = document.createElement('style');
        cssStyle.textContent =
            '.animation-rectButton .animation-buttonGlow { filter: url(#animation_blurred); }\n' +
            '.animation-rectButton .animation-buttonMain { fill: url(#animation_buttonNormal); }\n' +
            '.animation-buttonSelected .animation-buttonMain { fill: url(#animation_buttonSelected); }\n' +
            '.animation-rectButton:hover .animation-buttonMain { fill: url(#animation_buttonHovered); }\n' +
            '.animation-buttonDisabled .animation-buttonMain { fill: url(#animation_buttonDisabled); }\n' +
            '.animation-shuttleRingG .animation-shuttleRingSwoosh { fill: url(#animation_shuttleRingSwooshGradient); }\n' +
            '.animation-shuttleRingG:hover .animation-shuttleRingSwoosh { fill: url(#animation_shuttleRingSwooshHovered); }\n' +
            '.animation-shuttleRingPointer { fill: url(#animation_shuttleRingPointerGradient); }\n' +
            '.animation-shuttleRingPausePointer { fill: url(#animation_shuttleRingPointerPaused); }\n' +
            '.animation-knobOuter { fill: url(#animation_knobOuter); }\n' +
            '.animation-knobInner { fill: url(#animation_knobInner); }\n';
        document.head.insertBefore(cssStyle, document.head.childNodes[0]);

        var themeEle = document.createElement('div');
        themeEle.className = 'animation-theme';
        themeEle.innerHTML =
            '<div class="animation-themeNormal"></div>' +
            '<div class="animation-themeHover"></div>' +
            '<div class="animation-themeSelect"></div>' +
            '<div class="animation-themeDisabled"></div>' +
            '<div class="animation-themeKnob"></div>' +
            '<div class="animation-themePointer"></div>' +
            '<div class="animation-themeSwoosh"></div>' +
            '<div class="animation-themeSwooshHover"></div>';
        parentNode.appendChild(themeEle);
        widget._themeNormal = themeEle.childNodes[0];
        widget._themeHover = themeEle.childNodes[1];
        widget._themeSelect = themeEle.childNodes[2];
        widget._themeDisabled = themeEle.childNodes[3];
        widget._themeKnob = themeEle.childNodes[4];
        widget._themePointer = themeEle.childNodes[5];
        widget._themeSwoosh = themeEle.childNodes[6];
        widget._themeSwooshHover = themeEle.childNodes[7];

        var svg = this.svgNode = this._svg('svg:svg');

        // Define the XLink namespace that SVG uses
        svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', this._xlinkNS);

        var topG = this._topG = this._svg('g');

        widget.setScale(1);
        widget.onThemeChanged();

        var rectButton = function (x, y, path, tooltip) {
            var button = {
                'tagName' : 'g',
                'class' : 'animation-rectButton',
                'transform' : 'translate(' + x + ',' + y + ')',
                'children' : [
                    {
                        'tagName' : 'rect',
                        'class' : 'animation-buttonGlow',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 2,
                        'ry' : 2
                    }, {
                        'tagName' : 'rect',
                        'class' : 'animation-buttonMain',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 4,
                        'ry' : 4
                    }, {
                        'tagName': 'use',
                        'class' : 'animation-buttonPath',
                        'xlink:href' : path
                    }, {
                        'tagName': 'title',
                        'textContent' : tooltip
                    }
                ]
            };
            return widget._svgFromObject(button);
        };

        var wingButton = function (x, y, path, tooltip) {
            var button = {
                'tagName' : 'g',
                'class' : 'animation-rectButton',
                'transform' : 'translate(' + x + ',' + y + ')',
                'children' : [
                    {
                        'tagName' : 'use',
                        'class' : 'animation-buttonGlow',
                        'xlink:href' : '#animation_pathWingButton'
                    }, {
                        'tagName' : 'use',
                        'class' : 'animation-buttonMain',
                        'xlink:href' : '#animation_pathWingButton'
                    }, {
                        'tagName': 'use',
                        'class' : 'animation-buttonPath',
                        'xlink:href' : path
                    }, {
                        'tagName': 'title',
                        'textContent' : tooltip
                    }
                ]
            };
            return widget._svgFromObject(button);
        };

        var buttonsG = this._svg('g');

        // Realtime
        this.realtimeSVG = wingButton(3, 4, '#animation_pathClock', 'Real-time');
        this.realtimeTooltip = this.realtimeSVG.getElementsByTagName('title')[0];
        buttonsG.appendChild(this.realtimeSVG);
        this.realtimeSVG.addEventListener('click', function () {
            widget.animationController.playRealtime();
        }, true);

        // Play Reverse
        this.playReverseSVG = rectButton(44, 99, '#animation_pathPlayReverse', 'Play Reverse');
        buttonsG.appendChild(this.playReverseSVG);
        this.playReverseSVG.addEventListener('click', function () {
            widget.animationController.playReverse();
        }, true);

        // Play Forward
        this.playForwardSVG = rectButton(124, 99, '#animation_pathPlay', 'Play Forward');
        buttonsG.appendChild(this.playForwardSVG);
        this.playForwardSVG.addEventListener('click', function () {
            widget.animationController.play();
        }, true);

        // Pause
        this.pauseSVG = rectButton(84, 99, '#animation_pathPause', 'Pause');
        this.pauseTooltip = this.pauseSVG.getElementsByTagName('title')[0];
        buttonsG.appendChild(this.pauseSVG);
        this.pauseSVG.addEventListener('click', function () {
            if (widget.animationController.isAnimating()) {
                widget.animationController.pause();
            } else {
                widget.animationController.unpause();
            }
        }, true);

        var shuttleRingBackG = this._svg('g').set('class', 'animation-shuttleRingG');
        topG.appendChild(shuttleRingBackG);

        var shuttleRingBackPanel = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'animation-shuttleRingBack',
            'cx' : 100,
            'cy' : 100,
            'r' : 99
        });
        shuttleRingBackG.appendChild(shuttleRingBackPanel);

        var shuttleRingSwooshG = this._svgFromObject({
            'tagName' : 'g',
            'class' : 'animation-shuttleRingSwoosh',
            'children' : [
                {
                    'tagName' : 'use',
                    'transform' : 'translate(100,97) scale(-1,1)',
                    'xlink:href' : '#animation_pathSwooshFX'
                }, {
                    'tagName' : 'use',
                    'transform' : 'translate(100,97)',
                    'xlink:href' : '#animation_pathSwooshFX'
                }, {
                    'tagName' : 'line',
                    'x1' : 100,
                    'y1' : 8,
                    'x2' : 100,
                    'y2' : 22
                }
            ]
        });
        shuttleRingBackG.appendChild(shuttleRingSwooshG);

        this.shuttleRingPointer = this._svgFromObject({
            'tagName' : 'use',
            'class' : 'animation-shuttleRingPointer',
            'xlink:href' : '#animation_pathPointer'
        });
        shuttleRingBackG.appendChild(this.shuttleRingPointer);

        this._realtimeMode = false;
        this._isSystemTimeAvailable = true;
        this._shuttleRingAngle = 0;
        var shuttleRingDragging = false;

        function setShuttleRingFromMouse(e) {
            var centerX = widget._centerX;
            if (e.type === 'mousedown' || (shuttleRingDragging && e.type === 'mousemove')) {
                widget.clock.clockStep = ClockStep.SPEED_MULTIPLIER;
                var rect = svg.getBoundingClientRect();
                var x = e.clientX - centerX - rect.left;
                var y = e.clientY - centerX - rect.top;
                var angle = Math.atan2(y, x) * 180 / Math.PI + 90;
                if (angle > 180) {
                    angle -= 360;
                }
                var speed = widget._shuttleAngletoSpeed(angle);
                if (shuttleRingDragging || (Math.abs(widget._shuttleRingAngle - angle) < 15)) {
                    shuttleRingDragging = true;
                    if (speed !== 0) {
                        widget.clock.multiplier = speed;
                    }
                } else if (speed < widget.clock.multiplier) {
                    widget.animationController.moreReverse();
                } else if (speed > widget.clock.multiplier) {
                    widget.animationController.moreForward();
                }
                e.preventDefault();
                e.stopPropagation();
            } else {
                shuttleRingDragging = false;
            }
        }
        shuttleRingBackPanel.addEventListener('mousedown', setShuttleRingFromMouse, true);
        shuttleRingSwooshG.addEventListener('mousedown', setShuttleRingFromMouse, true);
        document.addEventListener('mousemove', setShuttleRingFromMouse, true);
        document.addEventListener('mouseup', setShuttleRingFromMouse, true);
        this.shuttleRingPointer.addEventListener('mousedown', setShuttleRingFromMouse, true);

        var knobG = this._svgFromObject({
            'tagName' : 'g',
            'transform' : 'translate(100,100)'
        });

        this.knobOuter = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'animation-knobOuter',
            'cx' : 0,
            'cy' : 0,
            'r' : 71
        });
        knobG.appendChild(this.knobOuter);
        this.knobOuter.addEventListener('mousedown', setShuttleRingFromMouse, true);

        var knobInner = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'animation-knobInner',
            'cx' : 0,
            'cy' : 0,
            'r' : 61  // Same size as shield
        });
        knobG.appendChild(knobInner);

        this.knobDate = this._svgText(0, -24, '');
        knobG.appendChild(this.knobDate);
        this.knobTime = this._svgText(0, -7, '');
        knobG.appendChild(this.knobTime);
        this.knobStatus = this._svgText(0, -41, '');
        knobG.appendChild(this.knobStatus);

        // This shield catches clicks on the knob itself (even while DOM elements underneath are changing).
        var knobShield = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'animation-blank',
            'cx' : 0,
            'cy' : 0,
            'r' : 61  // Same size as knobInner
        });
        knobG.appendChild(knobShield);

        topG.appendChild(knobG);

        this._lastKnobDate = '';
        this._lastKnobTime = '';
        this._lastKnobSpeed = '';
        this._lastPauseTooltip = '';
        this._wasAnimating = false;

        topG.appendChild(buttonsG);

        svg.appendChild(topG);
        parentNode.appendChild(svg);
    };

    function _twoDigits(num) {
        return ((num < 10) ? ('0' + num.toString()) : num.toString());
    }

    /**
     * Override this function to change the format of the date label on the widget.
     * The returned string will be displayed as the middle line of text on the widget.
     *
     * @function
     * @memberof Animation.prototype
     * @returns {String} : The human-readable version of the current date.
     */
    Animation.prototype.makeDateLabel = function (gregorianDate) {
        return this._monthNames[gregorianDate.month - 1] + ' ' + gregorianDate.day + ' ' + gregorianDate.year;
    };

    /**
     * Override this function to change the format of the time label on the widget.
     * The returned string will be displayed as the bottom line of text on the widget.
     *
     * @function
     * @memberof Animation.prototype
     * @returns {String} : The human-readable version of the current time.
     */
    Animation.prototype.makeTimeLabel = function (gregorianDate) {
        var millisecond = gregorianDate.millisecond, millisecondString = ' UTC';
        if ((millisecond > 0) && (Math.abs(this.clock.multiplier) < 0.9)) {
            millisecondString = Math.floor(millisecond).toString();
            while (millisecondString.length < 3) {
                millisecondString = '0' + millisecondString;
            }
            millisecondString = '.' + millisecondString;
        }

        return _twoDigits(gregorianDate.hour) + ':' + _twoDigits(gregorianDate.minute) + ':' +
            _twoDigits(gregorianDate.second) + millisecondString;
    };

    /**
     * Update the widget to reflect the current state of its {@link AnimationController}.
     * Typically, call this function once per animation frame, after the clock has ticked.
     *
     * @function
     * @memberof Animation.prototype
     */
    Animation.prototype.update = function () {
        var currentTime = this.clock.currentTime;
        var gregorianDate = currentTime.toGregorianDate();
        var currentTimeLabel = this.makeTimeLabel(gregorianDate);
        var currentDateLabel = this.makeDateLabel(gregorianDate);
        if (currentDateLabel !== this._lastKnobDate) {
            this._lastKnobDate = currentDateLabel;
            this._updateSvgText(this.knobDate, currentDateLabel);
        }
        if (currentTimeLabel !== this._lastKnobTime) {
            this._lastKnobTime = currentTimeLabel;
            this._updateSvgText(this.knobTime, currentTimeLabel);
        }

        var speed = this.clock.multiplier;
        var angle = this._shuttleSpeedtoAngle(speed);
        var tooltip, speedLabel;
        if (this.animationController.isAnimating()) {
            if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                speedLabel = 'Today';
            } else {
                speedLabel = speed + 'x';
            }
            tooltip = 'Pause';
        } else {
            speedLabel = speed + 'x';
            tooltip = 'Unpause';
        }

        var isAnimating = this.animationController.isAnimating();
        if (this._lastKnobSpeed !== speedLabel || this._wasAnimating !== isAnimating) {
            this._lastKnobSpeed = speedLabel;
            this._wasAnimating = isAnimating;
            if (!isAnimating) {
                this.shuttleRingPointer.set('class', 'animation-shuttleRingPausePointer');
                this.pauseSVG.set('class', 'animation-rectButton animation-buttonSelected');
                this.playForwardSVG.set('class', 'animation-rectButton');
                this.playReverseSVG.set('class', 'animation-rectButton');
            } else if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                this.shuttleRingPointer.set('class', 'animation-shuttleRingPointer');
                this.pauseSVG.set('class', 'animation-rectButton');
                this.playForwardSVG.set('class', 'animation-rectButton');
                this.playReverseSVG.set('class', 'animation-rectButton');
            } else if (speed > 0) {
                this.shuttleRingPointer.set('class', 'animation-shuttleRingPointer');
                this.pauseSVG.set('class', 'animation-rectButton');
                this.playForwardSVG.set('class', 'animation-rectButton animation-buttonSelected');
                this.playReverseSVG.set('class', 'animation-rectButton');
            } else {
                this.shuttleRingPointer.set('class', 'animation-shuttleRingPointer');
                this.pauseSVG.set('class', 'animation-rectButton');
                this.playForwardSVG.set('class', 'animation-rectButton');
                this.playReverseSVG.set('class', 'animation-rectButton animation-buttonSelected');
            }
            this._updateSvgText(this.knobStatus, speedLabel);
        }

        if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            if (!this._realtimeMode) {
                this._realtimeMode = true;
                this.realtimeSVG.set('class', 'animation-rectButton animation-buttonSelected');
                this.realtimeTooltip.textContent = 'Today (real-time)';
            }
        } else {
            var setRealtimeStyle = false;

            if (this._realtimeMode) {
                this._realtimeMode = false;
                setRealtimeStyle = true;
            }

            var isSystemTimeAvailable = this.clock.isSystemTimeAvailable();
            if (this._isSystemTimeAvailable !== isSystemTimeAvailable) {
                this._isSystemTimeAvailable = isSystemTimeAvailable;
                setRealtimeStyle = true;
            }

            if (setRealtimeStyle) {
                if (!isSystemTimeAvailable) {
                    this.realtimeSVG.set('class', 'animation-buttonDisabled');
                    this.realtimeTooltip.textContent = 'Current time not in range.';
                } else {
                    this.realtimeSVG.set('class', 'animation-rectButton');
                    this.realtimeTooltip.textContent = 'Today (real-time)';
                }
            }
        }

        if (this._shuttleRingAngle !== angle) {
            this._shuttleRingAngle = angle;
            this._setShuttleRingPointer(angle);
        }

        if (this._lastPauseTooltip !== tooltip) {
            this._lastPauseTooltip = tooltip;
            this.pauseTooltip.textContent = tooltip;
        }
    };

    return Animation;
});
