/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout',
        '../../ThirdParty/Tween'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        SceneTransforms,
        knockout,
        Tween) {
    "use strict";

    var screenSpacePos = new Cartesian2();

    function trackPosition(viewModel, position) {
        var container = viewModel._container;
        var containerWidth = container.parentNode.clientWidth;
        var containerHeight = container.parentNode.clientHeight;
        var indicatorSize = viewModel._selectionIndicatorElement.clientWidth;
        var halfSize = indicatorSize * 0.5;

        var posX = Math.min(Math.max(position.x, 0), containerWidth) - halfSize;
        var posY = Math.min(Math.max(position.y, 0), containerHeight) - halfSize;

        viewModel._positionX = Math.floor(posX + 0.25).toString() + 'px';
        viewModel._positionY = Math.floor(posY + 0.25).toString() + 'px';
    }

    /**
     * The view model for {@link SelectionIndicator}.
     * @alias SelectionIndicatorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Element} selectionIndicatorElement The element containing all elements that make up the selection indicator.
     * @param {Element} container The DOM element that contains the widget.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} selectionIndicatorElement is required.
     * @exception {DeveloperError} container is required.
     *
     */
    var SelectionIndicatorViewModel = function(scene, selectionIndicatorElement, container) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        if (!defined(selectionIndicatorElement)) {
            throw new DeveloperError('selectionIndicatorElement is required.');
        }

        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug')

        this._sanitizer = undefined;
        this._scene = scene;
        this._animationCollection = scene.getAnimations();
        this._container = defaultValue(container, document.body);
        this._selectionIndicatorElement = selectionIndicatorElement;
        this._computeScreenSpacePosition = function(position, result) {
            return SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
        };

        /**
         * The world position of the object for which to display the selection indicator.
         * @memberof SelectionIndicatorViewModel
         *
         * @type {Cartesian3}
         */
        this.position = undefined;

        /**
         * The x screen position of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this._positionX = '-1000px';

        /**
         * The y screen position of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this._positionY = '0';

        /**
         * The scale of the indicator relative to its default size.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.scale = 1;

        /**
         * The rotation angle of the indicator, in degrees.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.rotation = 0;

        /**
         * Gets or sets the maximum height of the info box in pixels.  This property is observable.
         * @type {Number}
         */
        this.maxHeight = 500;

        /**
         * Gets or sets the visibility of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showSelection = false;

        knockout.track(this, ['position', '_positionX', '_positionY', 'scale', 'rotation', 'showSelection']);

        /**
         * Gets the visibility of the position indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showPosition = undefined;
        knockout.defineProperty(this, 'showPosition', {
            get : function() {
                return this.showSelection && defined(this.position);
            }
        });

        knockout.defineProperty(this, '_transform', {
            get : function() {
                return 'rotate(' + (this.rotation) + ') scale(' + (this.scale) + ')';
            }
        });
    };

    /**
     * Updates the view of the selection indicator to match the position and content properties of the view model
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.update = function() {
        if (this.showSelection) {
            if (defined(this.position)) {
                var pos = this._computeScreenSpacePosition(this.position, screenSpacePos);
                trackPosition(this, pos);
            }
        }
    };

    /**
     * Animate the indicator to draw attention to the selection.
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.animateAppear = function() {
        var viewModel = this;
        this._animationCollection.add({
            startValue : {
                scale : 2
            },
            stopValue : {
                scale: 1
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.scale = value.scale;
            }
        });
    };

    /**
     * Animate the indicator to release the selection.
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.animateDepart = function() {
        var viewModel = this;
        this._animationCollection.add({
            startValue : {
                scale : viewModel.scale
            },
            stopValue : {
                scale : 1.5
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.scale = value.scale;
            }
        });
    };

    defineProperties(SelectionIndicatorViewModel.prototype, {
        /**
         * Gets the HTML element containing the selection indicator
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },
        /**
         * Gets the HTML element that makes up the selection indicator
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Element}
         */
        selectionIndicatorElement : {
            get : function() {
                return this._selectionIndicatorElement;
            }
        },
        /**
         * Gets the scene to control.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },
        /**
         * Gets or sets the function for converting the world position of the object to the screen space position.
         * Expects the {Cartesian3} parameter for the position and the optional {Cartesian2} parameter for the result.
         * Should return a {Cartesian2}.
         *
         * Defaults to SceneTransforms.wgs84ToWindowCoordinates
         *
         * @example
         * selectionIndicatorViewModel.computeScreenSpacePosition = function(position, result) {
         *     return Cartesian2.clone(position, result);
         * };
         *
         * @memberof SelectionIndicatorViewModel
         *
         * @type {Function}
         */
        computeScreenSpacePosition : {
            get : function() {
                return this._computeScreenSpacePosition;
            },
            set : function(value) {
                this._computeScreenSpacePosition = value;
            }
        }
    });

    return SelectionIndicatorViewModel;
});
