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

        dropDown.innerHTML = '\
<div data-bind="foreach: _viewNames">\
<div class="cesium-cameraControl-viewRow" data-bind="click: function (viewName) { $parent.visitStoredView(viewName); }">\
<span data-bind="text: $data"></span>\
<button type="button" class="cesium-button cesium-cameraControl-viewButton" data-bind="\
attr: { title: \'Visit this view\' },\
cesiumSvgPath: { path: $parent._cameraIcon, width: 32, height: 32 }"></button>\
<button type="button" class="cesium-button cesium-cameraControl-editButton" data-bind="\
attr: { title: \'Edit this view\' },\
click: function () { $parent.editorVisible = true; },\
cesiumSvgPath: { path: $parent._editIcon, width: 32, height: 32 }"></button>\
</div></div>\
<div class="cesium-cameraControl-addRow" data-bind="click: createName">Add or edit view...\
<button type="button" class="cesium-button cesium-cameraControl-addButton" data-bind="\
attr: { title: \'Add or edit view...\' },\
cesiumSvgPath: { path: _editIcon, width: 32, height: 32 }"></button></div>';

        var editor = document.createElement('div');
        editor.className = 'cesium-cameraControl-editor';
        editor.setAttribute('data-bind', '\
css: { "cesium-cameraControl-editor-visible" : editorVisible }');
        container.appendChild(editor);

        //<select size="2">\
        //<option value="EARTH_FIXED">Earth fixed (stars appear to rotate)</option>\
        //<option value="ICRF">Stars fixed (ICRF, Earth rotates)</option>\
        //</select><br/>\

        editor.innerHTML = '\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _followIcon, width: 32, height: 32 }"></span> \
Camera follows: <span data-bind="text: cameraFollows"></span></p>\
<p>Background object: <span data-bind="text: cameraBackground"></span></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _timeRotateIcon, width: 32, height: 32 }"></span> \
Rotation with time\
<span class="cesium-cameraControl-rotateOption" data-bind="visible: !isTrackingObject"><label><input type="radio" name="cesium-cameraControl-timeRotate" value="EARTH_FIXED" data-bind="checked: _timeRotateMode" /><span>Earth fixed (stars appear to rotate)</span></label></span>\
<span class="cesium-cameraControl-rotateOption" data-bind="visible: !isTrackingObject"><label><input type="radio" name="cesium-cameraControl-timeRotate" value="ICRF" data-bind="checked: _timeRotateMode" /><span>Stars fixed (ICRF, Earth rotates)</span></label></span>\
<span class="cesium-cameraControl-rotateOption" data-bind="visible: isTrackingObject"><label><input type="radio" name="cesium-cameraControl-timeRotate" value="LVLH" data-bind="checked: _timeRotateMode" /><span>Local up (LVLH)</span></label></span>\
<span class="cesium-cameraControl-rotateOption" data-bind="visible: isTrackingObject"><label><input type="radio" name="cesium-cameraControl-timeRotate" value="NORTH_UP" data-bind="checked: _timeRotateMode" /><span>North up (for high orbit views)</span></label></span>\
<span class="cesium-cameraControl-rotateOption" data-bind="visible: isTrackingObject"><label><input type="radio" name="cesium-cameraControl-timeRotate" value="FROM_OBJECT" data-bind="checked: _timeRotateMode" /><span>Body fixed</span></label></span></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _userRotateIcon, width: 32, height: 32 }"></span> \
Rotation with user input<br/>\
<label><input type="radio" name="cesium-cameraControl-userRotate" value="Z" data-bind="checked: _userRotateMode" /><span>Stay right-side up</span></label><br/>\
<label><input type="radio" name="cesium-cameraControl-userRotate" value="U" data-bind="checked: _userRotateMode" /><span>Unconstrained</span></label></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _fovIcon, width: 32, height: 32 }"></span> \
Field of View (degrees)<br/>\
<input class="cesium-cameraControl-fov-slider" type="range" min="0" max="1" step="0.001" data-bind="value: _fovSlider, valueUpdate: \'input\'" /> \
<input class="cesium-cameraControl-fov-number cesium-input" type="text" size="5" data-bind="value: fieldOfView" /></p>\
<p><span class="cesium-cameraControl-indicator" data-bind="cesiumSvgPath: { path: _bookmarkIcon, width: 32, height: 32 }"></span> \
Bookmarked view name:<br/>\
<input class="cesium-input" type="text" data-bind="value: currentViewName, valueUpdate: \'input\'" /><br/>\
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