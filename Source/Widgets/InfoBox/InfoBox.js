define([
    '../../Core/buildModuleUrl',
    '../../Core/Check',
    '../../Core/Color',
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/oneTimeWarning',
    '../../Core/defaultValue',
    '../../ThirdParty/knockout',
    '../getElement',
    '../subscribeAndEvaluate',
    './InfoBoxViewModel'
], function(
    buildModuleUrl,
    Check,
    Color,
    defined,
    defineProperties,
    destroyObject,
    oneTimeWarning,
    defaultValue,
    knockout,
    getElement,
    subscribeAndEvaluate,
    InfoBoxViewModel) {
    'use strict';

    /**
     * A widget for displaying information or a description.
     *
     * @alias InfoBox
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.allowScripts] A boolean value indicating if <script> tags should run inside the infobox iframe
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     */
    function InfoBox(container, options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('container', container);
        //>>includeEnd('debug')

        container = getElement(container);

        options = defaultValue(options, {allowScripts : false});
        var infoElement = document.createElement('div');
        infoElement.className = 'cesium-infoBox';
        infoElement.setAttribute('data-bind', '\
css: { "cesium-infoBox-visible" : showInfo, "cesium-infoBox-bodyless" : _bodyless }');
        container.appendChild(infoElement);

        var titleElement = document.createElement('div');
        titleElement.className = 'cesium-infoBox-title';
        titleElement.setAttribute('data-bind', 'text: titleText');
        infoElement.appendChild(titleElement);

        var cameraElement = document.createElement('button');
        cameraElement.type = 'button';
        cameraElement.className = 'cesium-button cesium-infoBox-camera';
        cameraElement.setAttribute('data-bind', '\
attr: { title: "Focus camera on object" },\
click: function () { cameraClicked.raiseEvent(this); },\
enable: enableCamera,\
cesiumSvgPath: { path: cameraIconPath, width: 32, height: 32 }');
        infoElement.appendChild(cameraElement);

        var closeElement = document.createElement('button');
        closeElement.type = 'button';
        closeElement.className = 'cesium-infoBox-close';
        closeElement.setAttribute('data-bind', '\
click: function () { closeClicked.raiseEvent(this); }');
        closeElement.innerHTML = '&times;';
        infoElement.appendChild(closeElement);

        var viewModel = new InfoBoxViewModel();
        knockout.applyBindings(viewModel, infoElement);

        this._container = container;
        this._element = infoElement;
        this._viewModel = viewModel;
        this._descriptionSubscription = undefined;
        this.allowScripts = defaultValue(options.allowScripts, false);

        this.createFrame();
    }

    defineProperties(InfoBox.prototype, {
        /**
         * A flag that allows scripts to run inside the infobox from the string.
         * Due to security issues default is false. It must be explicitly set during or after infobox creation.
         * @memberof InfoBox.prototype
         *
         * @type {Boolean}
         *
         * @example
         * var viewer = new Cesium.Viewer('cesiumContainer');
         * viewer.infoBox.allowScripts = true;
         *
         * * @example
         * var infoBox = new Cesium.InfoBox('infoBoxContainer', {allowScripts: true});
         */
        allowScripts : {
            get : function() {
                return this._allowScripts;
            },
            set : function(value) {
                if (!(value === this._allowScripts)) {
                    this._allowScripts = value;
                    this.createFrame();
                }
            }
        },
        /**
         * Gets the parent container.
         * @memberof InfoBox.prototype
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
         * @memberof InfoBox.prototype
         *
         * @type {InfoBoxViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        },

        /**
         * Gets the iframe used to display the description.
         * @memberof InfoBox.prototype
         *
         * @type {HTMLIFrameElement}
         */
        frame : {
            get : function() {
                return this._frame;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    InfoBox.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    InfoBox.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(this._element);
        container.removeChild(this._element);

        if (defined(this._descriptionSubscription)) {
            this._descriptionSubscription.dispose();
        }

        return destroyObject(this);
    };
    /**
     * Removes the frame if exists.
     */
    InfoBox.prototype.removeFrame = function() {
        // cache the frame
        var frame = this._frame;
        // if no frame exists, do nothing
        if (!(frame instanceof HTMLElement)) {
            return;
        }

        // if we subscribed, we need to remove subscription
        if (defined(this._descriptionSubscription)) {
            this._descriptionSubscription.dispose();
        }
        frame.parentNode.removeChild(frame);
        this._frame = null;
    };

    /**
     * Creates a new frame according to allowScripts.
     */
    InfoBox.prototype.createFrame = function() {
        this.removeFrame(); //make sure to remove existing frame if any
        var frame = document.createElement('iframe');
        frame.className = 'cesium-infoBox-iframe';
        frame.setAttribute('sandbox', this.allowScripts ?
                                      'allow-same-origin allow-popups allow-forms allow-scripts allow-modals' :
                                      'allow-same-origin allow-popups allow-forms'); //allow-pointer-lock allow-scripts allow-top-navigation
        frame.setAttribute('data-bind', 'style : { maxHeight : maxHeightOffset(40) }');
        frame.setAttribute('allowfullscreen', true);
        this._element.appendChild(frame);
        this._frame = frame;

        var that = this;
        //We can't actually add anything into the frame until the load event is fired
        frame.addEventListener('load', function() {
            var frameDocument = frame.contentDocument;
            if (frameDocument === null) {
                return;
            }
            //We inject default css into the content iframe,
            //end users can remove it or add their own via the exposed frame property.
            var cssLink = frameDocument.createElement('link');
            cssLink.href = buildModuleUrl('Widgets/InfoBox/InfoBoxDescription.css');
            cssLink.rel = 'stylesheet';
            cssLink.type = 'text/css';

            //div to use for description content.
            var frameContent = frameDocument.createElement('div');
            frameContent.className = 'cesium-infoBox-description';

            frameDocument.head.appendChild(cssLink);
            frameDocument.body.appendChild(frameContent);

            //We manually subscribe to the description event rather than through a binding for two reasons.
            //1. It's an easy way to ensure order of operation so that we can adjust the height.
            //2. Knockout does not bind to elements inside of an iFrame, so we would have to apply a second binding
            //   model anyway.
            that._descriptionSubscription = subscribeAndEvaluate(that._viewModel, 'description', function(value) {
                // Set the frame to small height, force vertical scroll bar to appear, and text to wrap accordingly.
                frame.style.height = '5px';
                InfoBox.stringToHtml(value, frameContent, that.allowScripts);

                //If the snippet is a single element, then use its background
                //color for the body of the InfoBox. This makes the padding match
                //the content and produces much nicer results.
                var background = null;
                var firstElementChild = frameContent.firstElementChild;
                if (firstElementChild !== null && frameContent.childNodes.length === 1) {
                    var style = window.getComputedStyle(firstElementChild);
                    if (style !== null) {
                        var backgroundColor = style['background-color'];
                        var color = Color.fromCssColorString(backgroundColor);
                        if (defined(color) && color.alpha !== 0) {
                            background = style['background-color'];
                        }
                    }
                }
                that._element.style['background-color'] = background;

                // Measure and set the new custom height, based on text wrapped above.
                var height = frameContent.getBoundingClientRect().height;
                frame.style.height = height + 'px';
            });
        });

        //Chrome does not send the load event unless we explicitly set a src
        frame.setAttribute('src', 'about:blank');
    };

    /**
     * Receives a string and enters it to the DOM
     * If the string contains a <script> tag, it is
     * parsed using contextualFragment
     *
     * @type {Function}.
     * @private
     */
    /**
     *
     * @param s {String}
     * @param frame {Element}
     * @param allowScripts {Boolean}
     */
    InfoBox.stringToHtml = function stringToHtml(s, frame, allowScripts) {
        // if we don't have a script tag - in case the method was used as static...
        if (allowScripts && s.indexOf('<script') > -1 && s.indexOf('</script>') > -1) {
            // make sure the frame is empty before appending new children to it
            frame.innerHTML = '';
            // we have a script tag - let's handle it
            // check for modern browsers
            if (defined(document.createRange) && defined(document.createRange().createContextualFragment)) {
                var fragment = document.createRange().createContextualFragment(s);
                frame.appendChild(fragment);
                return;
            }
            oneTimeWarning('Infobox content script not supported', 'Infobox content script not supported');
        }

        frame.innerHTML = s;

    };
    return InfoBox;
});
