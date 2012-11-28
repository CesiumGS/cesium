/*global define*/
define([
    '../Core/DeveloperError',
    '../Core/ClockStep'
], function(
    DeveloperError,
    ClockStep
) {
    "use strict";

    /**
     * This widget provides a UI to manipulate an AnimationController.
     * @alias Playback
     * @constructor
     *
     * @param {DOM Node} parentNode The parent HTML DOM node for this widget.
     * @param {AnimationController} animationController The animationController that will be manipulated by this widget.
     *
     * @see AnimationController
     * @see Clock
     */
    var Playback = function(parentNode, animationController) {
        this.parentNode = parentNode;
        this.animationController = animationController;
        if (typeof animationController !== 'object') {
            throw new DeveloperError('AnimationController parameter required to construct Playback widget.');
        }
        this.clock = animationController.clock;

        this._createNodes(parentNode);
    };

    Playback.prototype._svgNS = "http://www.w3.org/2000/svg";
    Playback.prototype._xlinkNS = "http://www.w3.org/1999/xlink";

    Playback.prototype._svgSet = function (name, val) {
        this.setAttribute(name, val);
        return this;
    };

    Playback.prototype._svg = function (name) {
        var element = document.createElementNS(this._svgNS, name);
        element.set = Playback.prototype._svgSet;
        return element;
    };

    Playback.prototype._svgFromObject = function (obj) {
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

    Playback.prototype._svgText = function(x, y, msg) {
        var text = this._svg('text').set('x', x).set('y', y).set('class', 'svgText');
        var tspan = this._svg('tspan');
        tspan.textContent = msg;
        text.appendChild(tspan);
        return text;
    };

    Playback.prototype._updateSvgText = function(svgText, msg) {
        svgText.childNodes[0].textContent = msg;
    };

    Playback.prototype._setSizeBig = function () {
        var svg = this.svgNode;
        svg.style.cssText = 'width: 200px; height: 131px; position: absolute; bottom: 0; left: 0;';
        svg.setAttribute('width', 200);
        svg.setAttribute('height', 131);
        svg.setAttribute('viewBox', '0 0 200 131');
    };

    Playback.prototype._setSizeSmall = function () {
        var svg = this.svgNode;
        svg.style.cssText = 'width: 200px; height: 74px; position: absolute; bottom: 0; left: 0;';
        svg.setAttribute('width', 200);
        svg.setAttribute('height', 74);
        svg.setAttribute('viewBox', '0 57 200 74');
    };

    Playback.prototype._maxShuttleAngle = 105;

    Playback.prototype._shuttleAngletoSpeed = function (angle) {
        if (Math.abs(angle) < 5) {
            return 0;
        }
        angle = Math.max(Math.min(angle, this._maxShuttleAngle), -this._maxShuttleAngle);
        var speed = Math.round(Math.exp(((Math.abs(angle) - 5) * 0.15)));
        if (angle < 0) {
            speed *= -1.0;
        }
        return speed;
    };

    Playback.prototype._shuttleSpeedtoAngle = function (speed) {
        var angle = Math.log(Math.abs(speed)) / 0.15 + 5;
        angle = Math.max(Math.min(angle, this._maxShuttleAngle), 0);
        if (speed < 0) {
            angle *= -1.0;
        }
        return angle;
    };

    Playback.prototype._setShuttleRingGlow = function (angle) {
        var glow = this.shuttleRingGlow.childNodes[1].childNodes[0];
        glow.setAttribute('transform', 'translate(101,80) rotate(' + angle + ') translate(-101,-80)');
    };

    Playback.prototype._createNodes = function(parentNode) {
        var widget = this;

        // This is a workaround for a bug or security feature in Firefox.
        var cssStyle = document.createElement('style');
        cssStyle.textContent =
            '.rectButton .buttonGlow { filter: url(#blurred); }\n' +
            '.rectButton .buttonMain { fill: url(#buttonNormal); }\n' +
            '.buttonSelected .buttonMain { fill: url(#buttonSelected); }\n' +
            '.rectButton:hover .buttonMain { fill: url(#buttonHovered); }\n' +
            '.shuttleRingPath { fill: url(#buttonRadialNormal); }\n' +
            '.shuttleRingGlow { fill: url(#shuttleRingGlowGradient); }\n';
        document.head.appendChild(cssStyle);

        var svg = this.svgNode = this._svg('svg:svg');

        // Define the XLink namespace that SVG uses
        svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', this._xlinkNS);

        this._setSizeSmall();

        var defs = {
            'tagName' : 'defs',
            'children' : [
                {
                    'id' : 'buttonNormal',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(116,117,119)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(58,68,82)' },   // add a 'stop-opacity' field to make translucent.
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(46,50,56)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(53,53,53)' }
                    ]
                }, {
                    'id' : 'buttonHovered',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(137,180,206)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(84,148,193)' },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(76,142,184)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(84,146,183)' }
                    ]
                }, {
                    'id' : 'buttonSelected',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(116,138,119)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(58,95,82)' },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(46,81,56)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(53,84,53)' }
                    ]
                }, {
                    'id' : 'buttonDisabled',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#696969' },
                        { 'tagName' : 'stop', 'offset' : '75%', 'stop-color' : '#333' }
                    ]
                }, {
                    'id' : 'buttonRadialNormal',
                    'tagName' : 'radialGradient',
                    'gradientUnits' : 'userSpaceOnUse',
                    //'xlink:href' : '#buttonNormal',
                    'cx' : 101.5, 'cy' : 92, 'r' : 105,
                    'children' : [   // Shift buttonNormal by 100-(y*0.65)
                        { 'tagName' : 'stop', 'offset' : '47%', 'stop-color' : 'rgb(53,53,53)' },
                        { 'tagName' : 'stop', 'offset' : '70%', 'stop-color' : 'rgb(46,50,56)' },
                        { 'tagName' : 'stop', 'offset' : '92%', 'stop-color' : 'rgb(58,62,72)' },  // was 58,68,82
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' : 'rgb(116,117,119)' }
                    ]
                }, {
                    'id' : 'blurred',
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
                    'id' : 'shuttleRingGlowGradient',
                    'tagName' : 'linearGradient',
                    'x1' : '0%', 'y1' : '50%', 'x2' : '100%', 'y2' : '50%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#2E2', 'stop-opacity' : 0 },
                        { 'tagName' : 'stop', 'offset' : '50%', 'stop-color' : '#2E2', 'stop-opacity' : 0.9 },
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' : '#2E2', 'stop-opacity' : 0 }
                    ]
                }, {
                    'id' : 'pathReset',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.316,5.318,9.833,13.682,9.833,5.5,5.5,5.5,5.5,25.5,9.833,25.5,9.833,17.318,24.316,25.682z'
                }, {
                    'id' : 'pathPause',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M13,5.5,7.5,5.5,7.5,25.5,13,25.5zM24.5,5.5,19,5.5,19,25.5,24.5,25.5z'
                }, {
                    'id' : 'pathPlay',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z'
                }, {
                    'id' : 'pathLoop',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.249,15.499c-0.009,4.832-3.918,8.741-8.75,8.75c-2.515,0-4.768-1.064-6.365-2.763l2.068-1.442l-7.901-3.703l0.744,8.694l2.193-1.529c2.244,2.594,5.562,4.242,9.26,4.242c6.767,0,12.249-5.482,12.249-12.249H24.249zM15.499,6.75c2.516,0,4.769,1.065,6.367,2.764l-2.068,1.443l7.901,3.701l-0.746-8.693l-2.192,1.529c-2.245-2.594-5.562-4.245-9.262-4.245C8.734,3.25,3.25,8.734,3.249,15.499H6.75C6.758,10.668,10.668,6.758,15.499,6.75z'
                }, {
                    'id' : 'pathFastForward',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M25.5,15.5,15.2,9.552,15.2,15.153,5.5,9.552,5.5,21.447,15.2,15.847,15.2,21.447z'
                }, {
                    'id' : 'pathClock',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M15.5,2.374C8.251,2.375,2.376,8.251,2.374,15.5C2.376,22.748,8.251,28.623,15.5,28.627c7.249-0.004,13.124-5.879,13.125-13.127C28.624,8.251,22.749,2.375,15.5,2.374zM15.5,25.623C9.909,25.615,5.385,21.09,5.375,15.5C5.385,9.909,9.909,5.384,15.5,5.374c5.59,0.01,10.115,4.535,10.124,10.125C25.615,21.09,21.091,25.615,15.5,25.623zM8.625,15.5c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,16.5,8.624,16.053,8.625,15.5zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.887,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM22.822,12.428c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,12.54,22.344,12.705,22.822,12.428zM12.062,21.455c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,22.344,12.54,21.732,12.062,21.455zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM22.823,18.572c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.092,0.367,1.367c0.477,0.275,1.089,0.113,1.365-0.365C23.464,19.461,23.3,18.848,22.823,18.572zM19.938,7.813c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM23.378,14.5c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,14.949,23.929,14.5,23.378,14.5zM15.501,6.624c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.365c0.275,0.479,0.889,0.643,1.365,0.367l3.305-1.676C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876C16.501,7.072,16.053,6.624,15.501,6.624zM15.501,22.377c-0.552,0-1,0.447-1,1s0.448,1,1,1s1-0.447,1-1S16.053,22.377,15.501,22.377zM18.939,21.455c-0.479,0.277-0.643,0.889-0.366,1.367c0.275,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.889,0.366-1.365C20.028,21.344,19.417,21.18,18.939,21.455z'
                }, {
                    'id' : 'pathSpeedUp',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) rotate(-90) scale(0.85) translate(-16,-16)',
                    'd' : 'm 14.022968,5.3125 0,3.6875 9.201946,6.5 -9.201946,6.5 0,3.6875 L 28.43935,15.5 14.022968,5.3125 z M 4.0202416,25.682 18.504164,15.5 4.0202416,5.318 v 20.364 z'
                }, {
                    'id' : 'pathSlowDown',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) rotate(90) scale(0.85) translate(-16,-16)',
                    'd' : 'm 14.022968,5.3125 0,3.6875 9.201946,6.5 -9.201946,6.5 0,3.6875 L 28.43935,15.5 14.022968,5.3125 z M 4.0202416,25.682 18.504164,15.5 4.0202416,5.318 v 20.364 z'
                }, {
                    'id' : 'pathShuttleRing',
                    'tagName' : 'path',
                    'd' : 'M 97.3125 -15 C 43.613935 -13.804403 0.5 24.838076 0.5 72.3125 C 0.5 87.461744 4.9031447 101.70594 12.625 114.125 L 56.1875 114.125 C 43.343916 103.74966 35.3125 88.854983 35.3125 72.3125 C 35.3125 40.964311 64.200208 15.5625 99.875 15.5625 C 135.54981 15.5625 164.46875 40.964311 164.46875 72.3125 C 164.46875 88.855889 156.41577 103.74959 143.5625 114.125 L 187.15625 114.125 C 194.88191 101.70627 199.28125 87.461168 199.28125 72.3125 C 199.28125 24.084514 154.75931 -15 99.875 -15 C 99.017433 -15 98.164858 -15.018978 97.3125 -15 z'
                }
            ]
        };

        svg.appendChild(this._svgFromObject(defs));

        var topG = this._svg('g');

        var rectButton = function (x, y, path, tooltip) {
            var button = {
                'tagName' : 'g',
                'class' : 'rectButton',
                'transform' : 'translate(' + x + ',' + y + ')',
                'children' : [
                    {
                        'tagName' : 'rect',
                        'class' : 'buttonGlow',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 2,
                        'ry' : 2
                    }, {
                        'tagName' : 'rect',
                        'class' : 'buttonMain',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 4,
                        'ry' : 4
                    }, {
                        'tagName': 'use',
                        'class' : 'buttonPath',
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
        topG.appendChild(buttonsG);

        // ShowShuttleRing
        var showShuttleRingSVG = rectButton(5, 63, '#pathShuttleRing', 'Shuttle ring');
        showShuttleRingSVG.childNodes[2].setAttribute('transform', 'scale(0.12) translate(30,75)');
        buttonsG.appendChild(showShuttleRingSVG);

        // Reset
        var resetSVG = rectButton(5, 97, '#pathReset', 'Reset');
        buttonsG.appendChild(resetSVG);
        resetSVG.addEventListener('click', function () {
            widget.animationController.reset();
        }, true);

        // Speed up
        var upSVG = rectButton(165, 63, '#pathSpeedUp', 'Faster');
        buttonsG.appendChild(upSVG);
        upSVG.addEventListener('click', function () {
            widget.animationController.faster();
        }, true);

        // Slow down
        var downSVG = rectButton(165, 97, '#pathSlowDown', 'Slower');
        buttonsG.appendChild(downSVG);
        downSVG.addEventListener('click', function () {
            widget.animationController.slower();
        }, true);

        var shuttleRingOuterG = this._svg('g').set('transform', 'translate(101,120)').set('class', 'shuttleRing');
        var shuttleRingG = this._svg('g').set('transform', 'translate(-101,-103)'); // leave y += 17

        var shuttleRingBack = this._svgFromObject({
            'tagName' : 'rect',
            'class' : 'shuttleRingBack',
            'x' : 39,
            'y' : 10,
            'width' : 121,
            'height' : 42
        });
        shuttleRingG.appendChild(shuttleRingBack);

        // Realtime
        this.realtimeSVG = rectButton(85, 18, '#pathClock', 'Realtime');
        shuttleRingG.appendChild(this.realtimeSVG);
        this.realtimeSVG.addEventListener('click', function () {
            widget.clock.clockStep = ClockStep.SYSTEM_CLOCK_TIME;
        }, true);

        var shuttleRingPath = this._svgFromObject({
            'tagName' : 'use',
            'xlink:href' : '#pathShuttleRing',
            'class' : 'shuttleRingPath'
        });
        shuttleRingG.appendChild(shuttleRingPath);

        this.shuttleRingGlow = this._svgFromObject({
            'tagName' : 'g',
            'clip-rule' : 'nonzero',
            'children' : [
                {
                    'tagName' : 'clipPath',
                    'id' : 'clipShuttleRing',
                    'children' : [
                        {
                            'tagName' : 'use',
                            'xlink:href' : '#pathShuttleRing'
                        }
                    ]
                }, {
                    'tagName' : 'g',
                    'clip-path' : 'url(#clipShuttleRing)',
                    'children' : [
                        {
                            'tagName' : 'rect',
                            'class' : 'shuttleRingGlow',
                            'x' : 81,
                            'y' : -25,
                            'width' : 40,
                            'height' : 100
                        }
                    ]
                }
            ]
        });
        shuttleRingG.appendChild(this.shuttleRingGlow);

        this._realtimeMode = false;
        this._isSystemTimeAvailable = true;
        this._shuttleRingVisible = false;
        this._shuttleRingAngle = 0;
        var shuttleRingDragging = false;

        function setShuttleRingFromMouse(e) {
            if (e.type === 'mousedown' || (shuttleRingDragging && e.type === 'mousemove')) {
                shuttleRingDragging = true;
                widget.clock.clockStep = ClockStep.SPEED_MULTIPLIER;
                var rect = shuttleRingPath.getBoundingClientRect();
                var x = e.clientX - 101 - rect.left;
                var y = e.clientY - 96 - rect.top;
                var angle = Math.atan2(y, x) * 180 / Math.PI + 90;
                if (angle > 180) {
                    angle -= 360;
                }
                var speed = widget._shuttleAngletoSpeed(angle);
                if (speed !== 0) {
                    widget.clock.multiplier = speed;
                    if (!widget.animationController.isAnimating()) {
                        widget.animationController.unpause();
                    }
                } else {
                    if (widget.animationController.isAnimating()) {
                        widget.animationController.pause();
                    }
                }
                e.preventDefault();
                e.stopPropagation();
            } else {
                shuttleRingDragging = false;
            }
        }
        shuttleRingPath.addEventListener('mousedown', setShuttleRingFromMouse, true);
        document.addEventListener('mousemove', setShuttleRingFromMouse, true);
        this.shuttleRingGlow.addEventListener('mousedown', setShuttleRingFromMouse, true);
        document.addEventListener('mouseup', setShuttleRingFromMouse, true);

        var shuttleRingLabelsG = this._svgFromObject({
            'tagName' : 'g',
            'class' : 'shuttleRingLabels',
            'children' : [
                    {
                        'tagName': 'use',
                        'transform' : 'translate(36,60) scale(-1,1)', // 101 - x
                        'xlink:href' : '#pathFastForward'
                    }, {
                        'tagName': 'use',
                        'transform' : 'translate(54,12) scale(-1,1)', // 101 - x
                        'xlink:href' : '#pathPlay'
                    }, {
                        'tagName': 'use',
                        'transform' : 'translate(85,-13)', // 101 - 16
                        'xlink:href' : '#pathPause'
                    }, {
                        'tagName': 'use',
                        'transform' : 'translate(148,12)', // 101 + x
                        'xlink:href' : '#pathPlay'
                    }, {
                        'tagName': 'use',
                        'transform' : 'translate(166,60)', // 101 + x
                        'xlink:href' : '#pathFastForward'
                    }
            ]
        });
        shuttleRingLabelsG.addEventListener('mousedown', setShuttleRingFromMouse, true);
        shuttleRingG.appendChild(shuttleRingLabelsG);
        shuttleRingOuterG.appendChild(shuttleRingG);

        var shuttleRingDismiss = this._svgFromObject({
            'tagName' : 'animateTransform',
            'attributeName' : 'transform',
            'attributeType' : 'XML',
            'type' : 'scale',
            'values' : '0.4;1;0.4',
            'calcMode' : 'spline',
            'keyTimes' : '0;0.5;1',
            'keySplines' : '0.5 0.5 0.5 1;0.5 0.5 0.5 1',
            'additive' : 'sum',
            'begin' : 'indefinite',
            'dur' : '1.0s',
            'fill' : 'freeze'
        });
        shuttleRingOuterG.appendChild(shuttleRingDismiss);
        topG.appendChild(shuttleRingOuterG);

        var largeButtonG = this._svgFromObject({
            'tagName' : 'g',
            'class' : 'rectButton',
            'transform' : 'translate(35,62)',
            'children' : [
                {
                    'tagName' : 'rect',
                    'class' : 'buttonGlow',
                    'width' : 132,
                    'height' : 68,
                    'rx' : 5,
                    'ry' : 5
                }, {
                    'tagName' : 'rect',
                    'class' : 'buttonMain',
                    'width' : 132,
                    'height' : 68,
                    'rx' : 7,
                    'ry' : 7
                }
            ]
        });

        this.largeButtonMode = this._svgFromObject({
            'tagName' : 'use',
            'xlink:href' : '#pathPlay',
            'x' : 5.666, // (halfWidth 65 / scale 3.0) - halfIcon 16
            'y' : -4,
            'transform' : 'scale(3)',
            'class' : 'playbackMode'
        });
        largeButtonG.appendChild(this.largeButtonMode);

        this.largeButtonDate = this._svgText(65, 25, '');
        largeButtonG.appendChild(this.largeButtonDate);
        this.largeButtonTime = this._svgText(65, 43, '');
        largeButtonG.appendChild(this.largeButtonTime);
        this.largeButtonStatus = this._svgText(65, 62, '');
        largeButtonG.appendChild(this.largeButtonStatus);
        this.largeButtonTooltip = this._svg('title');
        largeButtonG.appendChild(this.largeButtonTooltip);

        topG.appendChild(largeButtonG);

        this._lastButtonDate = '';
        this._lastButtonTime = '';
        this._lastButtonSpeed = '';
        this._lastButtonTooltip = '';

        function showButtons() {
            buttonsG.style.display = 'block';
        }

        function hideButtons() {
            buttonsG.style.display = 'none';
            widget._shuttleRingVisible = true;
        }

        largeButtonG.addEventListener('click', function () {
            if (widget._shuttleRingVisible) {
                shuttleRingDismiss.endElementAt(1);
                shuttleRingDismiss.beginElementAt(-0.5);  // Hide ring
                window.setTimeout(function() {
                    widget._setSizeSmall();
                    shuttleRingOuterG.style.display = 'none';
                }, 450);
                showButtons();
                widget._shuttleRingVisible = false;
            } else if (widget.animationController.isAnimating()) {
                widget.animationController.pause();
            } else {
                widget.animationController.unpause();
            }
        }, true);

        showShuttleRingSVG.addEventListener('click', function () {
            shuttleRingDismiss.beginElementAt(0);  // Show ring
            shuttleRingDismiss.endElementAt(0.5);
            shuttleRingOuterG.style.display = 'block';
            widget._setSizeBig();
            window.setTimeout(hideButtons, 200);
        }, true);

        svg.appendChild(topG);
        parentNode.appendChild(svg);
        shuttleRingOuterG.style.display = 'none';
    };

    /**
     * Update the widget to reflect the current state of animation.
     *
     * @function
     * @memberof Playback.prototype
     */
    Playback.prototype.update = function () {
        var currentTime = this.clock.currentTime;
        var currentTimeLabel = currentTime.toDate().toUTCString();
        var currentDateLabel = currentTimeLabel.substring(5, 16);
        currentTimeLabel = currentTimeLabel.substring(17);
        if (currentDateLabel !== this._lastButtonDate) {
            this._lastButtonDate = currentDateLabel;
            this._updateSvgText(this.largeButtonDate, currentDateLabel);
        }
        if (currentTimeLabel !== this._lastButtonTime) {
            this._lastButtonTime = currentTimeLabel;
            this._updateSvgText(this.largeButtonTime, currentTimeLabel);
        }

        var speed = 0, angle = 0, tooltip, speedLabel;
        if (this.animationController.isAnimating()) {
            if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                speedLabel = 'real-time';
            } else {
                speed = this.clock.multiplier;
                angle = this._shuttleSpeedtoAngle(speed);
                speedLabel = 'speed ' + speed + 'x';
            }
            tooltip = 'Pause';
        } else {
            speedLabel = 'paused';
            tooltip = 'Play';
        }

        var isSystemTimeAvailable = this.clock.isSystemTimeAvailable();
        if (this._isSystemTimeAvailable !== isSystemTimeAvailable) {
            this._isSystemTimeAvailable = isSystemTimeAvailable;
            if (isSystemTimeAvailable) {
                this.realtimeSVG.style.display = 'block';
            } else {
                this.realtimeSVG.style.display = 'none';
            }
        }

        if (this._lastButtonSpeed !== speedLabel) {
            this._lastButtonSpeed = speedLabel;
            if (this.animationController.isAnimating()) {
                if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                    this.largeButtonMode.setAttribute('transform', 'scale(3)');
                    this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathClock');
                } else if (speed < -15000) {
                    this.largeButtonMode.setAttribute('transform', 'scale(-3,3) translate(-40)');
                    this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathFastForward');
                } else if (speed < 0) {
                    this.largeButtonMode.setAttribute('transform', 'scale(-3,3) translate(-40)');
                    this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathPlay');
                } else if (speed < 15000) {
                    this.largeButtonMode.setAttribute('transform', 'scale(3)');
                    this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathPlay');
                } else {
                    this.largeButtonMode.setAttribute('transform', 'scale(3)');
                    this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathFastForward');
                }
            } else {
                this.largeButtonMode.setAttribute('transform', 'scale(3)');
                this.largeButtonMode.setAttributeNS(this._xlinkNS, 'href', '#pathPause');
            }
            this._updateSvgText(this.largeButtonStatus, speedLabel);
        }

        if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            if (!this._realtimeMode) {
                this._realtimeMode = true;
                this.shuttleRingGlow.style.display = 'none';
                this.realtimeSVG.set('class', 'rectButton buttonSelected');
            }
        } else {
            if (this._realtimeMode) {
                this._realtimeMode = false;
                this.shuttleRingGlow.style.display = 'block';
                this.realtimeSVG.set('class', 'rectButton');
            }
            if (this._shuttleRingAngle !== angle) {
                this._shuttleRingAngle = angle;
                this._setShuttleRingGlow(angle);
            }
        }

        if (this._shuttleRingVisible) {
            tooltip = 'Hide shuttle ring';
        }

        if (this._lastButtonTooltip !== tooltip) {
            this._lastButtonTooltip = tooltip;
            this.largeButtonTooltip.textContent = tooltip;
        }
    };

    return Playback;
});
