/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/EasingFunction',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        EasingFunction,
        SceneTransforms,
        knockout) {
    "use strict";

    var screenSpacePos = new Cartesian2();

    /**
     * The view model for {@link SelectionIndicator}.
     * @alias SelectionIndicatorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use for screen-space coordinate conversion.
     * @param {Element} selectionIndicatorElement The element containing all elements that make up the selection indicator.
     * @param {Element} container The DOM element that contains the widget.
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

        this._scene = scene;
        this._screenPositionX = '-1000px';
        this._screenPositionY = '0';
        this._tweens = scene.tweens;
        this._container = defaultValue(container, document.body);
        this._selectionIndicatorElement = selectionIndicatorElement;
        this._computeScreenSpacePosition = function(position, result) {
            return SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
        };
        this._scale = 1;

        /**
         * Gets or sets the world position of the object for which to display the selection indicator.
         * @type {Cartesian3}
         */
        this.position = undefined;

        /**
         * Gets or sets the visibility of the selection indicator.
         * @type {Boolean}
         */
        this.showSelection = false;

        knockout.track(this, ['position', '_screenPositionX', '_screenPositionY', '_scale', 'showSelection']);

        /**
         * Gets the visibility of the position indicator.  This can be false even if an
         * object is selected, when the selected object has no position.
         * @type {Boolean}
         */
        this.isVisible = undefined;
        knockout.defineProperty(this, 'isVisible', {
            get : function() {
                return this.showSelection && defined(this.position);
            }
        });

        knockout.defineProperty(this, '_transform', {
            get : function() {
                return 'scale(' + (this._scale) + ')';
            }
        });
    };

    /**
     * Updates the view of the selection indicator to match the position and content properties of the view model.
     * This function should be called as part of the render loop.
     */
    SelectionIndicatorViewModel.prototype.update = function() {
        if (this.showSelection && defined(this.position)) {
            var screenPosition = this._computeScreenSpacePosition(this.position, screenSpacePos);
            var container = this._container;
            var containerWidth = container.parentNode.clientWidth;
            var containerHeight = container.parentNode.clientHeight;
            var indicatorSize = this._selectionIndicatorElement.clientWidth;
            var halfSize = indicatorSize * 0.5;

            screenPosition.x = Math.min(Math.max(screenPosition.x, 0), containerWidth) - halfSize;
            screenPosition.y = Math.min(Math.max(screenPosition.y, 0), containerHeight) - halfSize;

            this._screenPositionX = Math.floor(screenPosition.x + 0.25) + 'px';
            this._screenPositionY = Math.floor(screenPosition.y + 0.25) + 'px';
        }
    };

    /**
     * Animate the indicator to draw attention to the selection.
     */
    SelectionIndicatorViewModel.prototype.animateAppear = function() {
        this._tweens.addProperty({
            object : this,
            property : '_scale',
            startValue : 2,
            stopValue : 1,
            duration : 0.8,
            easingFunction : EasingFunction.EXPONENTIAL_OUT
        });
    };

    /**
     * Animate the indicator to release the selection.
     */
    SelectionIndicatorViewModel.prototype.animateDepart = function() {
        this._tweens.addProperty({
            object : this,
            property : '_scale',
            startValue : this._scale,
            stopValue : 1.5,
            duration : 0.8,
            easingFunction : EasingFunction.EXPONENTIAL_OUT
        });
    };

    defineProperties(SelectionIndicatorViewModel.prototype, {
        /**
         * Gets the HTML element containing the selection indicator.
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
         * Gets the HTML element that holds the selection indicator.
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
         * Gets the scene being used.
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
         * Expects the {@link Cartesian3} parameter for the position and the optional {@link Cartesian2} parameter for the result.
         * Should return a {@link Cartesian2}.
         *
         * Defaults to SceneTransforms.wgs84ToWindowCoordinates
         *
         * @example
         * selectionIndicatorViewModel.computeScreenSpacePosition = function(position, result) {
         *     return Cartesian2.clone(position, result);
         * };
         *
         * @memberof SelectionIndicatorViewModel.prototype
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
