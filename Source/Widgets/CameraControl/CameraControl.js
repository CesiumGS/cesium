/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './CameraControlViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        CameraControlViewModel,
        knockout) {
    "use strict";

    /**
     * The CameraControl is a single button widget that displays a panel of available camera
     * control options.
     *
     * @alias CameraControl
     * @constructor
     *
     * @param {Element} container The parent HTML container node for this widget.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     */
    var CameraControl = function(container) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var viewModel = new CameraControlViewModel();

        viewModel._svgPath = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';

        var element = document.createElement('button');
        element.type = 'button';
        element.className = 'cesium-button cesium-toolbar-button cesium-cameraControl-button';
        element.setAttribute('data-bind', '\
attr: { title: tooltip },\
click: toggleDropDown,\
cesiumSvgPath: { path: _svgPath, width: 32, height: 32 }');
        container.appendChild(element);

        var dropDown = document.createElement('div');
        dropDown.className = 'cesium-cameraControl-dropDown';
        dropDown.setAttribute('data-bind', '\
css: { "cesium-cameraControl-dropDown-visible" : dropDownVisible }');
        container.appendChild(dropDown);

        dropDown.innerHTML = 'This is a test...';

        knockout.applyBindings(viewModel, element);
        knockout.applyBindings(viewModel, dropDown);

        element.firstChild.firstChild.setAttribute('transform', 'scale(-0.9,0.9) translate(-34,1.5)');

        this._viewModel = viewModel;
        this._container = container;
        this._element = element;
        this._dropDown = dropDown;

        this._closeDropDown = function(e) {
            if (!(element.contains(e.target) || dropDown.contains(e.target))) {
                viewModel.dropDownVisible = false;
            }
        };

        document.addEventListener('mousedown', this._closeDropDown, true);
        document.addEventListener('touchstart', this._closeDropDown, true);
    };

    defineProperties(CameraControl.prototype, {
        /**
         * Gets the parent container.
         * @memberof CameraControl.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof CameraControl.prototype
         *
         * @type {CameraControlViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof CameraControl
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CameraControl.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof CameraControl
     */
    CameraControl.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropDown, true);
        document.removeEventListener('touchstart', this._closeDropDown, true);
        knockout.cleanNode(this._element);
        knockout.cleanNode(this._dropDown);
        this._container.removeChild(this._element);
        this._container.removeChild(this._dropDown);
        return destroyObject(this);
    };

    return CameraControl;
});