/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement) {
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
     * // Create a home button
     * var svgPath = new SvgPath(container, 28, 28, 'M14,4l-10,8.75h20l-4.25-3.7188v-4.6562\
     * h-2.812v2.1875l-2.938-2.5625zm-7.0938,9.906v10.094h14.094v-10.094h-14.094zm2.1876,2.313\
     * h3.3122v4.25h-3.3122v-4.25zm5.8442,1.281h3.406v6.438h-3.406v-6.438z');
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

        svg.setAttribute('class', 'cesium-svgPath-svg');
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
         * Gets the root node of the SVG.
         *
         * @memberof SvgPath.prototype
         * @type {Element}
         */
        element : {
            get : function() {
                return this._svgNode;
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
        this._container.removeChild(this._svgNode);
        return destroyObject(this);
    };

    return SvgPath;
});
