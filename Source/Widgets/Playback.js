/*global define*/
define([
    '../Core/DeveloperError'
], function(
    DeveloperError
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
        //this._setupWidget();
    };

    Playback.prototype._svgSet = function (name, val) {
        this.setAttribute(name, val);
        return this;
    };

    Playback.prototype._svg = function (name) {
        var element = document.createElementNS('http://www.w3.org/2000/svg', name);
        element.set = Playback.prototype._svgSet;
        return element;
    };

    Playback.prototype._createNodes = function(parentNode) {
        var widget = this;
        var svg = this.containerNode = this._svg('svg:svg');
        svg.style.cssText = 'width: 100%; height: 100%;';
        svg.setAttribute('width', 200);
        svg.setAttribute('height', 100);

        // Define the XLink namespace that SVG uses
        svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // Set the coordinates used by drawings in the canvas
        //svg.setAttribute("viewBox", "0 0 " + userWidth + " " + userHeight);

        //this.testing = this._svg('path');
        //this.testing.setAttribute('d', '');
        //svg.appendChild(this.testing);

        // Reset
        var resetSVG = this._svg('path').set('transform', 'translate(0,0)').set('d',
                'M24.316,5.318,9.833,13.682,9.833,5.5,5.5,5.5,5.5,25.5,9.833,25.5,9.833,17.318,24.316,25.682z');
        svg.appendChild(resetSVG);
        resetSVG.addEventListener('click', function () { widget.animationController.reset(); }, true);

        // Play
        var playSVG = this._svg('path').set('transform', 'translate(25,0)').set('d',
                'M6.684,25.682L24.316,15.5L6.684,5.318V25.682z');
        svg.appendChild(playSVG);
        playSVG.addEventListener('click', function () { widget.animationController.play(); }, true);

        // Clock
        svg.appendChild(this._svg('path').set('transform', 'translate(50,0)').set('d',
                'M15.5,2.374C8.251,2.375,2.376,8.251,2.374,15.5C2.376,22.748,8.251,28.623,15.5,28.627c7.249-0.004,13.124-5.879,13.125-13.127C28.624,8.251,22.749,2.375,15.5,2.374zM15.5,25.623C9.909,25.615,5.385,21.09,5.375,15.5C5.385,9.909,9.909,5.384,15.5,5.374c5.59,0.01,10.115,4.535,10.124,10.125C25.615,21.09,21.091,25.615,15.5,25.623zM8.625,15.5c-0.001-0.552-0.448-0.999-1.001-1c-0.553,0-1,0.448-1,1c0,0.553,0.449,1,1,1C8.176,16.5,8.624,16.053,8.625,15.5zM8.179,18.572c-0.478,0.277-0.642,0.889-0.365,1.367c0.275,0.479,0.889,0.641,1.365,0.365c0.479-0.275,0.643-0.887,0.367-1.367C9.27,18.461,8.658,18.297,8.179,18.572zM9.18,10.696c-0.479-0.276-1.09-0.112-1.366,0.366s-0.111,1.09,0.365,1.366c0.479,0.276,1.09,0.113,1.367-0.366C9.821,11.584,9.657,10.973,9.18,10.696zM22.822,12.428c0.478-0.275,0.643-0.888,0.366-1.366c-0.275-0.478-0.89-0.642-1.366-0.366c-0.479,0.278-0.642,0.89-0.366,1.367C21.732,12.54,22.344,12.705,22.822,12.428zM12.062,21.455c-0.478-0.275-1.089-0.111-1.366,0.367c-0.275,0.479-0.111,1.09,0.366,1.365c0.478,0.277,1.091,0.111,1.365-0.365C12.704,22.344,12.54,21.732,12.062,21.455zM12.062,9.545c0.479-0.276,0.642-0.888,0.366-1.366c-0.276-0.478-0.888-0.642-1.366-0.366s-0.642,0.888-0.366,1.366C10.973,9.658,11.584,9.822,12.062,9.545zM22.823,18.572c-0.48-0.275-1.092-0.111-1.367,0.365c-0.275,0.479-0.112,1.092,0.367,1.367c0.477,0.275,1.089,0.113,1.365-0.365C23.464,19.461,23.3,18.848,22.823,18.572zM19.938,7.813c-0.477-0.276-1.091-0.111-1.365,0.366c-0.275,0.48-0.111,1.091,0.366,1.367s1.089,0.112,1.366-0.366C20.581,8.702,20.418,8.089,19.938,7.813zM23.378,14.5c-0.554,0.002-1.001,0.45-1.001,1c0.001,0.552,0.448,1,1.001,1c0.551,0,1-0.447,1-1C24.378,14.949,23.929,14.5,23.378,14.5zM15.501,6.624c-0.552,0-1,0.448-1,1l-0.466,7.343l-3.004,1.96c-0.478,0.277-0.642,0.889-0.365,1.365c0.275,0.479,0.889,0.643,1.365,0.367l3.305-1.676C15.39,16.99,15.444,17,15.501,17c0.828,0,1.5-0.671,1.5-1.5l-0.5-7.876C16.501,7.072,16.053,6.624,15.501,6.624zM15.501,22.377c-0.552,0-1,0.447-1,1s0.448,1,1,1s1-0.447,1-1S16.053,22.377,15.501,22.377zM18.939,21.455c-0.479,0.277-0.643,0.889-0.366,1.367c0.275,0.477,0.888,0.643,1.366,0.365c0.478-0.275,0.642-0.889,0.366-1.365C20.028,21.344,19.417,21.18,18.939,21.455z'));

        parentNode.appendChild(svg);
    };

    return Playback;
});
