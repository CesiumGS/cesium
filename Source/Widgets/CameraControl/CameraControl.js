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
    var CameraControl = function(container, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var viewModel = new CameraControlViewModel(scene);

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
foreach: _viewNames');
        dropDown.appendChild(viewsContainer);

        var viewRow = document.createElement('div');
        viewRow.className = 'cesium-cameraControl-viewRow';
        viewRow.setAttribute('data-bind', '\
click: function (viewName) { $parent.visitStoredView(viewName); }');
        viewsContainer.appendChild(viewRow);

        var viewName = document.createElement('span');
        viewName.setAttribute('data-bind', '\
text: $data');
        viewRow.appendChild(viewName);

        var viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.className = 'cesium-button cesium-cameraControl-viewButton';
        viewButton.setAttribute('data-bind', '\
attr: { title: "Visit this view" },\
cesiumSvgPath: { path: $parent._cameraIcon, width: 32, height: 32 }');
        viewRow.appendChild(viewButton);

        var editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'cesium-button cesium-cameraControl-editButton';
        editButton.setAttribute('data-bind', '\
attr: { title: "Edit this view" },\
click: function (viewName) { $parent.editorVisible = true; },\
cesiumSvgPath: { path: $parent._editIcon, width: 32, height: 32 }');
        viewRow.appendChild(editButton);

        var addRow = document.createElement('div');
        addRow.className = 'cesium-cameraControl-addRow';
        addRow.innerHTML = 'Add or edit view...';
        addRow.setAttribute('data-bind', '\
click: createName');
        dropDown.appendChild(addRow);

        var addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'cesium-button cesium-cameraControl-addButton';
        addButton.setAttribute('data-bind', '\
attr: { title: "Add or edit view..." },\
cesiumSvgPath: { path: _editIcon, width: 32, height: 32 }');
        addRow.appendChild(addButton);

        var editor = document.createElement('div');
        editor.className = 'cesium-cameraControl-editor';
        editor.setAttribute('data-bind', '\
css: { "cesium-cameraControl-editor-visible" : editorVisible }');
        container.appendChild(editor);

        editor.innerHTML = '\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _followIcon, width: 32, height: 32 }"></span> \
Camera follows: <span data-bind="text: cameraFollows"></span></p>\
<p>Background object: <span data-bind="text: cameraBackground"></span></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _timeRotateIcon, width: 32, height: 32 }"></span> \
Rotation with time<br/>\
<label><input type="radio" name="cesium-cameraControl-timeRotate" value="ECF" data-bind="checked: _timeRotateMode" /><span>Earth fixed (stars appear to rotate)</span></label><br/>\
<label><input type="radio" name="cesium-cameraControl-timeRotate" value="ICRF" data-bind="checked: _timeRotateMode" /><span>Stars fixed (ICRF, Earth rotates)</span></label></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _userRotateIcon, width: 32, height: 32 }"></span> \
Rotation with user input<br/>\
<label><input type="radio" name="cesium-cameraControl-userRotate" value="Z" data-bind="checked: _userRotateMode" /><span>Stay right-side up</span></label><br/>\
<label><input type="radio" name="cesium-cameraControl-userRotate" value="U" data-bind="checked: _userRotateMode" /><span>Unconstrained</span></label></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _fovIcon, width: 32, height: 32 }"></span> \
Field of View (degrees)<br/>\
<input class="cesium-cameraControl-fov" type="range" min="0" max="1" step="0.001" data-bind="value: _fovSlider" /> \
<input class="cesium-cameraControl-fov" type="text" size="5" data-bind="value: fieldOfView" /></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _bookmarkIcon, width: 32, height: 32 }"></span> \
Bookmarked view name:<br/>\
<input type="text" data-bind="value: currentViewName, valueUpdate: \'input\'" /><br/>\
<button class="cesium-button" type="button" data-bind="text: _saveLabel, click: saveStoredView" />\
<button class="cesium-button" type="button" data-bind="click: function() { editorVisible = false; }">Cancel</button></p>';

        knockout.applyBindings(viewModel, element);
        knockout.applyBindings(viewModel, dropDown);
        knockout.applyBindings(viewModel, editor);

        element.firstChild.firstChild.setAttribute('transform', 'scale(-0.9,0.9) translate(-34,1.5)');

        this._viewModel = viewModel;
        this._container = container;
        this._element = element;
        this._dropDown = dropDown;
        this._editor = editor;

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
        this._viewModel.destroy();
        knockout.cleanNode(this._element);
        knockout.cleanNode(this._dropDown);
        knockout.cleanNode(this._editor);
        this._container.removeChild(this._element);
        this._container.removeChild(this._dropDown);
        this._container.removeChild(this._editor);
        return destroyObject(this);
    };

    return CameraControl;
});