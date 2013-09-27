/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        knockout) {
    "use strict";

    var svgNS = "http://www.w3.org/2000/svg";

    /**
     * The SvgPath widget creates a DOM element for a single SVG path.
     *
     * @alias SvgPath
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the SVG.
     * @param {Number} pathWidth The width of the SVG path with no transformations applied.
     * @param {Number} pathHeight The height of the SVG path with no transformations applied.
     * @param {String} path The SVG path as a string.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     * @exception {DeveloperError} pathWidth is required.
     * @exception {DeveloperError} pathHeight is required.
     * @exception {DeveloperError} path is required.
     *
     * @example
     * // TODO: example
     */
    var SvgPath = function(container, pathWidth, pathHeight, path) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(pathWidth)) {
            throw new DeveloperError('pathWidth is required.');
        }

        if (!defined(pathHeight)) {
            throw new DeveloperError('pathHeight is required.');
        }

        if (!defined(path)) {
            throw new DeveloperError('path is required.');
        }

        container = getElement(container);

        this._container = container;
        this._pathWidth = pathWidth;
        this._pathHeight = pathHeight;
        this._path = path;

        var svg = document.createElementNS(svgNS, 'svg:svg');
        this._svgNode = svg;

        svg.style.cssText = 'width: 100%; height: 100%; position: relative; overflow: hidden;';
        svg.setAttribute('width', pathWidth);
        svg.setAttribute('height', pathHeight);
        svg.setAttribute('viewBox', '0 0 ' + pathWidth + ' ' + pathHeight);

        var pathElement = document.createElementNS(svgNS, 'path');
        pathElement.setAttribute('d', path);
        this._pathElement = pathElement;

        svg.appendChild(pathElement);
        container.appendChild(svg);
    };

    defineProperties(SvgPath.prototype, {
        /**
         * Gets the parent container.
         *
         * @memberof SvgPath.prototype
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the path.
         *
         * @memberof SvgPath.prototype
         * @type {String}
         */
        path : {
            get : function() {
                return this._path;
            },
            set : function(value) {
                if (this._path !== value) {
                    this._pathElement.setAttribute('d', value);
                    this._path = value;
                }
            }
        }
    });

    /**
     * @memberof SvgPath
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    SvgPath.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the animation widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof SvgPath
     */
    SvgPath.prototype.destroy = function() {
        return destroyObject(this);
    };

    return SvgPath;
});
