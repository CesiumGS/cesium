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
        var text = this._svg('text').set('x', x).set('y', y).set('class', 'playback-svgText');
        var tspan = this._svg('tspan');
        tspan.textContent = msg;
        text.appendChild(tspan);
        return text;
    };

    Playback.prototype._updateSvgText = function(svgText, msg) {
        svgText.childNodes[0].textContent = msg;
    };

    Playback.prototype._maxShuttleAngle = 105;

    Playback.prototype._shuttleAngletoSpeed = function (angle) {
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

    Playback.prototype._shuttleSpeedtoAngle = function (speed) {
        var angle = Math.log(Math.abs(speed)) / 0.15 + 15;
        angle = Math.max(Math.min(angle, this._maxShuttleAngle), 0);
        if (speed < 0) {
            angle *= -1.0;
        }
        return angle;
    };

    Playback.prototype._setShuttleRingPointer = function (angle) {
        this.shuttleRingPointer.setAttribute('transform', 'translate(100,100) rotate(' + angle + ')');
        this.knobOuter.setAttribute('transform', 'rotate(' + angle + ')');
    };

    Playback.prototype._createNodes = function(parentNode) {
        var widget = this;

        // This is a workaround for a bug or security feature in Firefox.
        var cssStyle = document.createElement('style');
        cssStyle.textContent =
            '.playback-rectButton .playback-buttonGlow { filter: url(#playback_blurred); }\n' +
            '.playback-rectButton .playback-buttonMain { fill: url(#playback_buttonNormal); }\n' +
            '.playback-buttonSelected .playback-buttonMain { fill: url(#playback_buttonSelected); }\n' +
            '.playback-rectButton:hover .playback-buttonMain { fill: url(#playback_buttonHovered); }\n' +
            '.playback-shuttleRingG .playback-shuttleRingSwoosh { fill: url(#playback_shuttleRingSwooshGradient); }\n' +
            '.playback-shuttleRingG:hover .playback-shuttleRingSwoosh { fill: url(#playback_shuttleRingSwooshHovered); }\n' +
            '.playback-shuttleRingPointer { fill: url(#playback_shuttleRingPointerGradient); }\n' +
            '.playback-shuttleRingPausePointer { fill: url(#playback_shuttleRingPointerPaused); }\n' +
            '.playback-knobOuter { fill: url(#playback_knobOuter); }\n' +
            '.playback-knobInner { fill: url(#playback_knobInner); }\n';
        document.head.appendChild(cssStyle);

        var svg = this.svgNode = this._svg('svg:svg');

        // Define the XLink namespace that SVG uses
        svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', this._xlinkNS);

        svg.style.cssText = 'width: 200px; height: 132px; position: absolute; bottom: 0; left: 0;';
        svg.setAttribute('width', 200);
        svg.setAttribute('height', 132);
        svg.setAttribute('viewBox', '0 0 200 132');

        var defs = {
            'tagName' : 'defs',
            'children' : [
                {
                    'id' : 'playback_buttonNormal',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(116,117,119)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(58,68,82)' },   // add a 'stop-opacity' field to make translucent.
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(46,50,56)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(53,53,53)' }
                    ]
                }, {
                    'id' : 'playback_buttonHovered',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(137,180,206)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(84,148,193)' },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(76,142,184)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(84,146,183)' }
                    ]
                }, {
                    'id' : 'playback_buttonSelected',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : 'rgb(116,138,119)' },
                        { 'tagName' : 'stop', 'offset' : '12%', 'stop-color' : 'rgb(58,95,82)' },
                        { 'tagName' : 'stop', 'offset' : '46%', 'stop-color' : 'rgb(46,81,56)' },
                        { 'tagName' : 'stop', 'offset' : '81%', 'stop-color' : 'rgb(53,84,53)' }
                    ]
                }, {
                    'id' : 'playback_buttonDisabled',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#696969' },
                        { 'tagName' : 'stop', 'offset' : '75%', 'stop-color' : '#333' }
                    ]
                }, {
                    'id' : 'playback_blurred',
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
                    'id' : 'playback_shuttleRingSwooshGradient',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#8AC', 'stop-opacity' : 0.2 },
                        { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' : '#8AC', 'stop-opacity' : 0.85 },
                        { 'tagName' : 'stop', 'offset' : '95%', 'stop-color' : '#8AC', 'stop-opacity' : 0.05 }
                    ]
                }, {
                    'id' : 'playback_shuttleRingSwooshHovered',
                    'tagName' : 'linearGradient',
                    'x1' : '50%', 'y1' : '0%', 'x2' : '50%', 'y2' : '100%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#AEF', 'stop-opacity' : 0.2 },
                        { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' : '#AEF', 'stop-opacity' : 0.85 },
                        { 'tagName' : 'stop', 'offset' : '95%', 'stop-color' : '#AEF', 'stop-opacity' : 0.05 }
                    ]
                }, {
                    'id' : 'playback_shuttleRingPointerGradient',
                    'tagName' : 'linearGradient',
                    'x1' : '0%', 'y1' : '50%', 'x2' : '100%', 'y2' : '50%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#2E2' },
                        { 'tagName' : 'stop', 'offset' : '40%', 'stop-color' : '#2E2' },
                        { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' : '#072' },
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' : '#072' }
                    ]
                }, {
                    'id' : 'playback_shuttleRingPointerPaused',
                    'tagName' : 'linearGradient',
                    'x1' : '0%', 'y1' : '50%', 'x2' : '100%', 'y2' : '50%',
                    'children' : [
                        { 'tagName' : 'stop', 'offset' : '0%', 'stop-color' : '#CCC' },
                        { 'tagName' : 'stop', 'offset' : '40%', 'stop-color' : '#CCC' },
                        { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' : '#555' },
                        { 'tagName' : 'stop', 'offset' : '100%', 'stop-color' : '#555' }
                    ]
                }, {
                    'id' : 'playback_knobOuter',
                    'tagName' : 'linearGradient',
                    'x1' : '20%', 'y1' : '0%', 'x2' : '90%', 'y2' : '100%',
                    'children' : [
                          { 'tagName' : 'stop', 'offset' : '5%', 'stop-color' : 'rgb(116,117,119)' },
                          { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' : 'rgb(46,50,56)' },
                          { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' : 'rgb(58,68,82)' }
                    ]
                }, {
                    'id' : 'playback_knobInner',
                    'tagName' : 'linearGradient',
                    'x1' : '20%', 'y1' : '0%', 'x2' : '90%', 'y2' : '100%',
                    'children' : [
                          { 'tagName' : 'stop', 'offset' : '5%', 'stop-color' : 'rgb(53,53,53)' },
                          { 'tagName' : 'stop', 'offset' : '60%', 'stop-color' : 'rgb(116,117,119)' },
                          { 'tagName' : 'stop', 'offset' : '85%', 'stop-color' : 'rgb(53,53,53)' }
                    ]
                }, {
                    'id' : 'playback_pathReset',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.316,5.318,9.833,13.682,9.833,5.5,5.5,5.5,5.5,25.5,9.833,25.5,9.833,17.318,24.316,25.682z'
                }, {
                    'id' : 'playback_pathPause',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M13,5.5,7.5,5.5,7.5,25.5,13,25.5zM24.5,5.5,19,5.5,19,25.5,24.5,25.5z'
                }, {
                    'id' : 'playback_pathPlay',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z'
                }, {
                    'id' : 'playback_pathPlayReverse',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(-0.85,0.85) translate(-16,-16)',
                    'd' : 'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z'
                }, {
                    'id' : 'playback_pathLoop',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.249,15.499c-0.009,4.832-3.918,8.741-8.75,8.75c-2.515,0-4.768-1.064-6.365-2.763l2.068-1.442l-7.901-3.703l0.744,8.694l2.193-1.529c2.244,2.594,5.562,4.242,9.26,4.242c6.767,0,12.249-5.482,12.249-12.249H24.249zM15.499,6.75c2.516,0,4.769,1.065,6.367,2.764l-2.068,1.443l7.901,3.701l-0.746-8.693l-2.192,1.529c-2.245-2.594-5.562-4.245-9.262-4.245C8.734,3.25,3.25,8.734,3.249,15.499H6.75C6.758,10.668,10.668,6.758,15.499,6.75z'
                }, {
                    'id' : 'playback_pathFastForward',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M25.5,15.5,15.2,9.552,15.2,15.153,5.5,9.552,5.5,21.447,15.2,15.847,15.2,21.447z'
                }, {
                    'id' : 'playback_pathClock',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-15.5)',
                    'd' : 'M15.5,2.374C8.251,2.375,2.376,8.251,2.374,15.5C2.376,22.748,8.251,28.623,15.5,28.627c7.249-0.004,13.124-5.879,13.125-13.127C28.624,8.251,22.749,2.375,15.5,2.374zM15.5,25.623C9.909,25.615,5.385,21.09,5.375,15.5C5.385,9.909,9.909,5.384,15.5,5.374c5.59,0.01,10.115,4.535,10.124,10.125C25.615,21.09,21.091,25.615,15.5,25.623zM8.625,15.5c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,16.5,8.624,16.053,8.625,15.5zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.887,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM22.822,12.428c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,12.54,22.344,12.705,22.822,12.428zM12.062,21.455c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,22.344,12.54,21.732,12.062,21.455zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM22.823,18.572c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.092,0.367,1.367c0.477,0.275,1.089,0.113,1.365-0.365C23.464,19.461,23.3,18.848,22.823,18.572zM19.938,7.813c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM23.378,14.5c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,14.949,23.929,14.5,23.378,14.5zM15.501,6.624c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.365c0.275,0.479,0.889,0.643,1.365,0.367l3.305-1.676C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876C16.501,7.072,16.053,6.624,15.501,6.624zM15.501,22.377c-0.552,0-1,0.447-1,1s0.448,1,1,1s1-0.447,1-1S16.053,22.377,15.501,22.377zM18.939,21.455c-0.479,0.277-0.643,0.889-0.366,1.367c0.275,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.889,0.366-1.365C20.028,21.344,19.417,21.18,18.939,21.455z'
                }, {
                    'id' : 'playback_pathSpeedUp',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'm 14.022968,5.3125 0,3.6875 9.201946,6.5 -9.201946,6.5 0,3.6875 L 28.43935,15.5 14.022968,5.3125 z M 4.0202416,25.682 18.504164,15.5 4.0202416,5.318 v 20.364 z'
                }, {
                    'id' : 'playback_pathSlowDown',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) rotate(180) scale(0.85) translate(-16,-16)',
                    'd' : 'm 14.022968,5.3125 0,3.6875 9.201946,6.5 -9.201946,6.5 0,3.6875 L 28.43935,15.5 14.022968,5.3125 z M 4.0202416,25.682 18.504164,15.5 4.0202416,5.318 v 20.364 z'
                }, {
                    'id' : 'playback_pathWingButton',
                    'tagName' : 'path',
                    'd' : 'm 4.5,0.5 c -2.216,0 -4,1.784 -4,4 l 0,24 c 0,2.216 1.784,4 4,4 l 13.71875,0 C 22.478584,27.272785 27.273681,22.511272 32.5,18.25 l 0,-13.75 c 0,-2.216 -1.784,-4 -4,-4 l -24,0 z'
                }, {
                    'id' : 'playback_pathX',
                    'tagName' : 'path',
                    'transform' : 'translate(16,16) scale(0.85) translate(-16,-16)',
                    'd' : 'M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z'
                }, {
                    'id' : 'playback_pathPointer',
                    'tagName' : 'path',
                    'd' : 'M-15,-65,-15,-55,15,-55,15,-65,0,-95z'
                }, {
                    'id' : 'playback_pathSwooshFX',
                    'tagName' : 'path',
                    'd' : 'm 85,0 c 0,16.617 -4.813944,35.356 -13.131081,48.4508 h 6.099803 c 8.317138,-13.0948 13.13322,-28.5955 13.13322,-45.2124 0,-46.94483 -38.402714,-85.00262 -85.7743869,-85.00262 -1.0218522,0 -2.0373001,0.0241 -3.0506131,0.0589 45.958443,1.59437 82.723058,35.77285 82.723058,81.70532 z'
                }
            ]
        };

        svg.appendChild(this._svgFromObject(defs));

        var topG = this._svg('g');

        var rectButton = function (x, y, path, tooltip) {
            var button = {
                'tagName' : 'g',
                'class' : 'playback-rectButton',
                'transform' : 'translate(' + x + ',' + y + ')',
                'children' : [
                    {
                        'tagName' : 'rect',
                        'class' : 'playback-buttonGlow',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 2,
                        'ry' : 2
                    }, {
                        'tagName' : 'rect',
                        'class' : 'playback-buttonMain',
                        'width' : 32,
                        'height' : 32,
                        'rx' : 4,
                        'ry' : 4
                    }, {
                        'tagName': 'use',
                        'class' : 'playback-buttonPath',
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
                'class' : 'playback-rectButton',
                'transform' : 'translate(' + x + ',' + y + ')',
                'children' : [
                    {
                        'tagName' : 'use',
                        'class' : 'playback-buttonGlow',
                        'xlink:href' : '#playback_pathWingButton'
                    }, {
                        'tagName' : 'use',
                        'class' : 'playback-buttonMain',
                        'xlink:href' : '#playback_pathWingButton'
                    }, {
                        'tagName': 'use',
                        'class' : 'playback-buttonPath',
                        'xlink:href' : path
                    }, {
                        'tagName': 'title',
                        'textContent' : tooltip
                    }
                ]
            };
            return widget._svgFromObject(button);
        };

/*        // More Reverse
        var moreReverseSVG = rectButton(4, 4, '#playback_pathSlowDown', 'Reverse');
        topG.appendChild(moreReverseSVG);
        moreReverseSVG.addEventListener('click', function () {
            widget.animationController.moreReverse();
        }, true);

        // More Forward
        var moreForwardSVG = rectButton(164, 4, '#playback_pathSpeedUp', 'Forward');
        topG.appendChild(moreForwardSVG);
        moreForwardSVG.addEventListener('click', function () {
            widget.animationController.moreForward();
        }, true);*/

/*        // Play Reverse
        this.playReverseSVG = rectButton(4, 4, '#playback_pathPlayReverse', 'Play Reverse');
        topG.appendChild(this.playReverseSVG);
        this.playReverseSVG.addEventListener('click', function () {
            widget.animationController.playReverse();
        }, true);

        // Play Forward
        this.playForwardSVG = rectButton(164, 4, '#playback_pathPlay', 'Play Forward');
        topG.appendChild(this.playForwardSVG);
        this.playForwardSVG.addEventListener('click', function () {
            widget.animationController.play();
        }, true);*/

        var buttonsG = this._svg('g');

/*        // More Reverse
        var moreReverseSVG = rectButton(44, 100, '#playback_pathSlowDown', 'Reverse');
        buttonsG.appendChild(moreReverseSVG);
        moreReverseSVG.addEventListener('click', function () {
            widget.animationController.moreReverse();
        }, true);

        // More Forward
        var moreForwardSVG = rectButton(124, 100, '#playback_pathSpeedUp', 'Forward');
        buttonsG.appendChild(moreForwardSVG);
        moreForwardSVG.addEventListener('click', function () {
            widget.animationController.moreForward();
        }, true);*/

/*        // More Reverse
        var moreReverseSVG = wingButton(44, 2, -1, 'Reverse');
        buttonsG.appendChild(moreReverseSVG);
        moreReverseSVG.addEventListener('click', function () {
            widget.animationController.moreReverse();
        }, true);

        // More Forward
        var moreForwardSVG = wingButton(156, 2, 1, 'Forward');
        buttonsG.appendChild(moreForwardSVG);
        moreForwardSVG.addEventListener('click', function () {
            widget.animationController.moreForward();
        }, true);*/

        // Realtime
        this.realtimeSVG = wingButton(3, 4, '#playback_pathClock', 'Real-time');
        this.realtimeTooltip = this.realtimeSVG.getElementsByTagName('title')[0];
        buttonsG.appendChild(this.realtimeSVG);
        this.realtimeSVG.addEventListener('click', function () {
            widget.animationController.playRealtime();
        }, true);

        // Play Reverse
        this.playReverseSVG = rectButton(44, 99, '#playback_pathPlayReverse', 'Play Reverse');
        buttonsG.appendChild(this.playReverseSVG);
        this.playReverseSVG.addEventListener('click', function () {
            widget.animationController.playReverse();
        }, true);

        // Play Forward
        this.playForwardSVG = rectButton(124, 99, '#playback_pathPlay', 'Play Forward');
        buttonsG.appendChild(this.playForwardSVG);
        this.playForwardSVG.addEventListener('click', function () {
            widget.animationController.play();
        }, true);

        // Pause
        this.pauseSVG = rectButton(84, 99, '#playback_pathPause', 'Pause');
        this.pauseTooltip = this.pauseSVG.getElementsByTagName('title')[0];
        buttonsG.appendChild(this.pauseSVG);
        this.pauseSVG.addEventListener('click', function () {
            if (widget.animationController.isAnimating()) {
                widget.animationController.pause();
            } else {
                widget.animationController.unpause();
            }
        }, true);

        var shuttleRingBackG = this._svg('g').set('class', 'playback-shuttleRingG');
        topG.appendChild(shuttleRingBackG);

        var shuttleRingBackPanel = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'playback-shuttleRingBack',
            'cx' : 100,
            'cy' : 100,
            'r' : 99
        });
        shuttleRingBackG.appendChild(shuttleRingBackPanel);

        var shuttleRingSwooshG = this._svgFromObject({
            'tagName' : 'g',
            'class' : 'playback-shuttleRingSwoosh',
            'children' : [
                {
                    'tagName' : 'use',
                    'transform' : 'translate(100,97) scale(-1,1)',
                    'xlink:href' : '#playback_pathSwooshFX'
                }, {
                    'tagName' : 'use',
                    'transform' : 'translate(100,97)',
                    'xlink:href' : '#playback_pathSwooshFX'
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
            'class' : 'playback-shuttleRingPointer',
            'xlink:href' : '#playback_pathPointer'
        });
        shuttleRingBackG.appendChild(this.shuttleRingPointer);

/*        // Realtime
        this.realtimeSVG = rectButton(84, 1, '#playback_pathClock', 'Real-time');
        this.realtimeTooltip = this.realtimeSVG.getElementsByTagName('title')[0];
        shuttleRingBackG.appendChild(this.realtimeSVG);
        this.realtimeSVG.addEventListener('click', function () {
            widget.animationController.playRealtime();
        }, true);*/

        this._realtimeMode = false;
        this._isSystemTimeAvailable = true;
        this._shuttleRingAngle = 0;
        var shuttleRingDragging = false;

        function setShuttleRingFromMouse(e) {
            if (e.type === 'mousedown' || (shuttleRingDragging && e.type === 'mousemove')) {
                widget.clock.clockStep = ClockStep.SPEED_MULTIPLIER;
                var rect = svg.getBoundingClientRect();
                var x = e.clientX - 100 - rect.left;
                var y = e.clientY - 100 - rect.top;
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
            'class' : 'playback-knobOuter',
            'cx' : 0,
            'cy' : 0,
            'r' : 71
        });
        knobG.appendChild(this.knobOuter);
        this.knobOuter.addEventListener('mousedown', setShuttleRingFromMouse, true);

        var knobInner = this._svgFromObject({
            'tagName' : 'circle',
            'class' : 'playback-knobInner',
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
            'class' : 'playback-blank',
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
                this.shuttleRingPointer.set('class', 'playback-shuttleRingPausePointer');
                this.pauseSVG.set('class', 'playback-rectButton playback-buttonSelected');
                this.playForwardSVG.set('class', 'playback-rectButton');
                this.playReverseSVG.set('class', 'playback-rectButton');
            } else if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                this.shuttleRingPointer.set('class', 'playback-shuttleRingPointer');
                this.pauseSVG.set('class', 'playback-rectButton');
                this.playForwardSVG.set('class', 'playback-rectButton');
                this.playReverseSVG.set('class', 'playback-rectButton');
            } else if (speed > 0) {
                this.shuttleRingPointer.set('class', 'playback-shuttleRingPointer');
                this.pauseSVG.set('class', 'playback-rectButton');
                this.playForwardSVG.set('class', 'playback-rectButton playback-buttonSelected');
                this.playReverseSVG.set('class', 'playback-rectButton');
            } else {
                this.shuttleRingPointer.set('class', 'playback-shuttleRingPointer');
                this.pauseSVG.set('class', 'playback-rectButton');
                this.playForwardSVG.set('class', 'playback-rectButton');
                this.playReverseSVG.set('class', 'playback-rectButton playback-buttonSelected');
            }
            this._updateSvgText(this.knobStatus, speedLabel);
        }

        if (this.clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            if (!this._realtimeMode) {
                this._realtimeMode = true;
                this.realtimeSVG.set('class', 'playback-rectButton playback-buttonSelected');
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
                    this.realtimeSVG.set('class', 'playback-buttonDisabled');
                    this.realtimeTooltip.textContent = 'Current time not in range.';
                } else {
                    this.realtimeSVG.set('class', 'playback-rectButton');
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

    return Playback;
});
