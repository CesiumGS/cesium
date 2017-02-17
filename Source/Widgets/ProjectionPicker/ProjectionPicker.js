/*global define*/
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

    var flatMapPath = 'm 2.9825053,17.550598 0,1.368113 0,26.267766 0,1.368113 1.36811,0 54.9981397,0 1.36811,0 0,-1.368113 0,-26.267766 0,-1.368113 -1.36811,0 -54.9981397,0 -1.36811,0 z m 2.73623,2.736226 10.3292497,0 0,10.466063 -10.3292497,0 0,-10.466063 z m 13.0654697,0 11.69737,0 0,10.466063 -11.69737,0 0,-10.466063 z m 14.43359,0 11.69737,0 0,10.466063 -11.69737,0 0,-10.466063 z m 14.43359,0 10.32926,0 0,10.466063 -10.32926,0 0,-10.466063 z m -41.9326497,13.202288 10.3292497,0 0,10.329252 -10.3292497,0 0,-10.329252 z m 13.0654697,0 11.69737,0 0,10.329252 -11.69737,0 0,-10.329252 z m 14.43359,0 11.69737,0 0,10.329252 -11.69737,0 0,-10.329252 z m 14.43359,0 10.32926,0 0,10.329252 -10.32926,0 0,-10.329252 z';
    var columbusViewPath = 'm 14.723969,17.675598 -0.340489,0.817175 -11.1680536,26.183638 -0.817175,1.872692 2.076986,0 54.7506996,0 2.07698,0 -0.81717,-1.872692 -11.16805,-26.183638 -0.34049,-0.817175 -0.91933,0 -32.414586,0 -0.919322,0 z m 1.838643,2.723916 6.196908,0 -2.928209,10.418977 -7.729111,0 4.460412,-10.418977 z m 9.02297,0 4.903049,0 0,10.418977 -7.831258,0 2.928209,-10.418977 z m 7.626964,0 5.584031,0 2.62176,10.418977 -8.205791,0 0,-10.418977 z m 8.410081,0 5.51593,0 4.46042,10.418977 -7.38863,0 -2.58772,-10.418977 z m -30.678091,13.142892 8.103649,0 -2.89416,10.282782 -9.6018026,0 4.3923136,-10.282782 z m 10.929711,0 8.614384,0 0,10.282782 -11.508544,0 2.89416,-10.282782 z m 11.338299,0 8.852721,0 2.58772,10.282782 -11.440441,0 0,-10.282782 z m 11.678781,0 7.86531,0 4.39231,10.282782 -9.6699,0 -2.58772,-10.282782 z';

    /**
     * <p>The ProjectionPicker is a single button widget for switching between perspective and orthographic projections.
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

        viewModel._perspectivePath = flatMapPath;
        viewModel._orthographicPath = columbusViewPath;

        var wrapper = document.createElement('span');
        wrapper.className = 'cesium-projectionPicker-wrapper cesium-toolbar-button';
        container.appendChild(wrapper);

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cesium-button cesium-toolbar-button';
        button.setAttribute('data-bind', '\
css: { "cesium-projectionPicker-buttonPerspective": !_orthographic,\
       "cesium-projectionPicker-buttonOrthographic": _orthographic,\
       "cesium-projectionPicker-selected": dropDownVisible },\
attr: { title: selectedTooltip },\
click: toggleDropDown');
        button.innerHTML = '\
<!-- ko cesiumSvgPath: { path: _perspectivePath, width: 64, height: 64, css: "cesium-projectionPicker-slide-svg cesium-projectionPicker-iconPerspective" } --><!-- /ko -->\
<!-- ko cesiumSvgPath: { path: _orthographicPath, width: 64, height: 64, css: "cesium-projectionPicker-slide-svg cesium-projectionPicker-iconOrthographic" } --><!-- /ko -->';
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
