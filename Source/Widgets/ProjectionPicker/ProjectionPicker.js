define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/FeatureDetection',
        '../../ThirdParty/knockout',
        '../getElement',
        './ProjectionPickerViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        knockout,
        getElement,
        ProjectionPickerViewModel) {
    'use strict';

    var perspectivePath = 'M 28.15625,10.4375 9.125,13.21875 13.75,43.25 41.75,55.09375 50.8125,37 54.5,11.9375 z m 0.125,3 19.976451,0.394265 L 43.03125,16.875 22.6875,14.28125 z M 50.971746,15.705477 47.90625,36.03125 42.53125,46 44.84375,19.3125 z M 12.625,16.03125 l 29.15625,3.6875 -2.65625,31 L 16.4375,41.125 z';
    var orthographicPath = 'm 31.560594,6.5254438 -20.75,12.4687502 0.1875,24.5625 22.28125,11.8125 19.5,-12 0.65625,-0.375 0,-0.75 0.0312,-23.21875 z m 0.0625,3.125 16.65625,9.5000002 -16.125,10.28125 -17.34375,-9.71875 z m 18.96875,11.1875002 0.15625,20.65625 -17.46875,10.59375 0.15625,-20.28125 z m -37.0625,1.25 17.21875,9.625 -0.15625,19.21875 -16.9375,-9 z';

    /**
     * The ProjectionPicker is a single button widget for switching between perspective and orthographic projections.
     *
     * @alias ProjectionPicker
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @example
     * // In HTML head, include a link to the ProjectionPicker.css stylesheet,
     * // and in the body, include: <div id="projectionPickerContainer"></div>
     * // Note: This code assumes you already have a Scene instance.
     *
     * var projectionPicker = new Cesium.ProjectionPicker('projectionPickerContainer', scene);
     */
    function ProjectionPicker(container, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var viewModel = new ProjectionPickerViewModel(scene);

        viewModel._perspectivePath = perspectivePath;
        viewModel._orthographicPath = orthographicPath;

        var wrapper = document.createElement('span');
        wrapper.className = 'cesium-projectionPicker-wrapper cesium-toolbar-button';
        container.appendChild(wrapper);

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cesium-button cesium-toolbar-button';
        button.setAttribute('data-bind', '\
css: { "cesium-projectionPicker-buttonPerspective": !_orthographic,\
       "cesium-projectionPicker-buttonOrthographic": _orthographic,\
       "cesium-button-disabled" : sceneMode === _sceneMode.SCENE2D || _flightInProgress, \
       "cesium-projectionPicker-selected": dropDownVisible },\
attr: { title: selectedTooltip },\
click: toggleDropDown');
        button.innerHTML = '\
<!-- ko cesiumSvgPath: { path: _perspectivePath, width: 64, height: 64, css: "cesium-projectionPicker-iconPerspective" } --><!-- /ko -->\
<!-- ko cesiumSvgPath: { path: _orthographicPath, width: 64, height: 64, css: "cesium-projectionPicker-iconOrthographic" } --><!-- /ko -->';
        wrapper.appendChild(button);

        var perspectiveButton = document.createElement('button');
        perspectiveButton.type = 'button';
        perspectiveButton.className = 'cesium-button cesium-toolbar-button cesium-projectionPicker-dropDown-icon';
        perspectiveButton.setAttribute('data-bind', '\
css: { "cesium-projectionPicker-visible" : (dropDownVisible && _orthographic),\
       "cesium-projectionPicker-none" : !_orthographic,\
       "cesium-projectionPicker-hidden" : !dropDownVisible },\
attr: { title: tooltipPerspective },\
click: switchToPerspective,\
cesiumSvgPath: { path: _perspectivePath, width: 64, height: 64 }');
        wrapper.appendChild(perspectiveButton);

        var orthographicButton = document.createElement('button');
        orthographicButton.type = 'button';
        orthographicButton.className = 'cesium-button cesium-toolbar-button cesium-projectionPicker-dropDown-icon';
        orthographicButton.setAttribute('data-bind', '\
css: { "cesium-projectionPicker-visible" : (dropDownVisible && !_orthographic),\
       "cesium-projectionPicker-none" : _orthographic,\
       "cesium-projectionPicker-hidden" : !dropDownVisible},\
attr: { title: tooltipOrthographic },\
click: switchToOrthographic,\
cesiumSvgPath: { path: _orthographicPath, width: 64, height: 64 }');
        wrapper.appendChild(orthographicButton);

        knockout.applyBindings(viewModel, wrapper);

        this._viewModel = viewModel;
        this._container = container;
        this._wrapper = wrapper;

        this._closeDropDown = function(e) {
            if (!wrapper.contains(e.target)) {
                viewModel.dropDownVisible = false;
            }
        };
        if (FeatureDetection.supportsPointerEvents()) {
            document.addEventListener('pointerdown', this._closeDropDown, true);
        } else {
            document.addEventListener('mousedown', this._closeDropDown, true);
            document.addEventListener('touchstart', this._closeDropDown, true);
        }
    }

    defineProperties(ProjectionPicker.prototype, {
        /**
         * Gets the parent container.
         * @memberof ProjectionPicker.prototype
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
         * @memberof ProjectionPicker.prototype
         *
         * @type {ProjectionPickerViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    ProjectionPicker.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    ProjectionPicker.prototype.destroy = function() {
        this._viewModel.destroy();

        if (FeatureDetection.supportsPointerEvents()) {
            document.removeEventListener('pointerdown', this._closeDropDown, true);
        } else {
            document.removeEventListener('mousedown', this._closeDropDown, true);
            document.removeEventListener('touchstart', this._closeDropDown, true);
        }

        knockout.cleanNode(this._wrapper);
        this._container.removeChild(this._wrapper);

        return destroyObject(this);
    };

    return ProjectionPicker;
});
