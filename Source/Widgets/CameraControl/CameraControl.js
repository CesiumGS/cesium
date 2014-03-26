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

        var element = document.createElement('button');
        element.type = 'button';
        element.className = 'cesium-button cesium-toolbar-button cesium-cameraControl-button';
        element.setAttribute('data-bind', '\
attr: { title: tooltip },\
click: toggleDropDown,\
cesiumSvgPath: { path: _cameraIcon, width: 32, height: 32 }');
        container.appendChild(element);

        var dropDown = document.createElement('div');
        dropDown.className = 'cesium-cameraControl-dropDown';
        dropDown.setAttribute('data-bind', '\
css: { "cesium-cameraControl-dropDown-visible" : dropDownVisible }');
        container.appendChild(dropDown);

        var viewsContainer = document.createElement('div');
        viewsContainer.setAttribute('data-bind', '\
foreach: viewNames');
        dropDown.appendChild(viewsContainer);

        var viewRow = document.createElement('div');
        viewRow.className = 'cesium-cameraControl-viewRow';
        viewRow.setAttribute('data-bind', '\
click: function (viewName) { $parent.visitStoredView.raiseEvent(viewName); $parent.dropDownVisible = false; }');
        viewsContainer.appendChild(viewRow);

        var viewName = document.createElement('span');
        viewName.setAttribute('data-bind', '\
text: $data');
        viewRow.appendChild(viewName);

        var viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.className = 'cesium-button cesium-cameraControl-viewButton';
        viewButton.setAttribute('data-bind', '\
attr: { title: "Activate this view" },\
cesiumSvgPath: { path: $parent._cameraIcon, width: 32, height: 32 }');
        viewRow.appendChild(viewButton);

        var editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'cesium-button cesium-cameraControl-editButton';
        editButton.setAttribute('data-bind', '\
attr: { title: "Edit this view" },\
click: function (viewName) { $parent.editStoredView.raiseEvent(viewName); $parent.dropDownVisible = false; },\
cesiumSvgPath: { path: $parent._editIcon, width: 32, height: 32 }');
        viewRow.appendChild(editButton);

        var addRow = document.createElement('div');
        addRow.className = 'cesium-cameraControl-addRow';
        addRow.innerHTML = 'Bookmark this view...';
        addRow.setAttribute('data-bind', '\
click: function () { addStoredView.raiseEvent(); dropDownVisible = false; }');
        dropDown.appendChild(addRow);

        var addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'cesium-button cesium-cameraControl-addButton';
        addButton.setAttribute('data-bind', '\
attr: { title: "Bookmark this view..." },\
cesiumSvgPath: { path: _bookmarkIcon, width: 32, height: 32 }');
        addRow.appendChild(addButton);

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