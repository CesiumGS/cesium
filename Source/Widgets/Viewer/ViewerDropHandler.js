/*global define*/
define(['../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../DynamicScene/CzmlDataSource'
        ], function(
                defaultValue,
                DeveloperError,
                defineProperties,
                destroyObject,
                Event,
                CzmlDataSource) {
    "use strict";

    /**
     * Adds default drag and drop support to the Viewer widget.  This allows CZML files to be dropped
     * onto the Viewer or provided container element and be loaded into the viewer.
     *
     * @alias ViewerDropHandler
     * @constructor
     *
     * @param {Viewer} viewer The viewer instance.
     * @param {Element|String} [options.dropTarget=viewer.container] The DOM element or ID that will contain the widget.
     * @param {Boolean} [options.clearOnDrop=true] When true, dropping files will clear all existing data sources first, when false, new data sources will be loaded after the existing ones.
     * @exception {DeveloperError} viewer is required.
     * @exception {DeveloperError} Element with id <options.dropTarget> does not exist in the document.
     *
     * @example
     * // Add basic drag and drop support with a simple error pop-up.
     * var viewer = new Viewer('cesiumContainer');
     * var dropHandler = new ViewerDropHandler(viewer);
     * dropHandler.onError.addEventListener(function(dropHandler, source, error) {
     *     window.alert('Error processing ' + source + ':' + error);
     * });
     */
    var ViewerDropHandler = function(viewer, options) {
        if (typeof viewer === 'undefined') {
            throw new DeveloperError('viewer is required.');
        }
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var dropTarget = defaultValue(options.dropTarget, viewer.container);
        if (typeof dropTarget === 'string') {
            var tmp = document.getElementById(dropTarget);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + dropTarget + '" does not exist in the document.');
            }
            dropTarget = tmp;
        }

        this._dropTarget = dropTarget;
        this._enabled = true;
        this._onError = new Event();
        this._viewer = viewer;
        this._clearOnDrop = defaultValue(options.clearOnDrop, true);

        var that = this;
        this._handleDrop = function(event) {
            stop(event);

            var dataSources = viewer.dataSources;
            if (that._clearOnDrop) {
                dataSources.removeAll();
            }

            var files = event.dataTransfer.files;
            var length = files.length;
            for ( var i = 0; i < length; i++) {
                var f = files[i];
                var reader = new FileReader();
                reader.onload = createOnLoadCallback(that, f.name, i === 0);
                reader.onerror = createOnErrorCallback(that, f.name);
                reader.readAsText(f);
            }
        };

        subscribe(this);
    };

    defineProperties(ViewerDropHandler.prototype, {
        /**
         * Gets or sets the element to serve as the drop target.
         * @memberof ViewerDropHandler.prototype
         * @type {Element}
         */
        dropTarget : {
            //TODO See https://github.com/AnalyticalGraphicsInc/cesium/issues/832
            //* @exception {DeveloperError} value is required.
            get : function() {
                return this._dropTarget;
            },
            set : function(value) {
                if (typeof value === 'undefined') {
                    throw new DeveloperError('value is required.');
                }
                unsubscribe(this);
                this._dropTarget = value;
                subscribe(this);
            }
        },

        /**
         * Gets or sets a value indicating if drag and drop support is enabled.
         * @memberof ViewerDropHandler.prototype
         * @type {Element}
         */
        enabled : {
            get : function() {
                return this._enabled;
            },
            set : function(value) {
                if (value !== this._enabled) {
                    if (value) {
                        subscribe(this);
                    } else {
                        unsubscribe(this);
                    }
                    this._enabled = value;
                }
            }
        },

        /**
         * Gets the event that will be raised when an error is encountered during drop processing.
         * @memberof ViewerDropHandler.prototype
         * @type {Event}
         */
        onError : {
            get : function() {
                return this._onError;
            }
        },

        /**
         * Gets the viewer instance being used.
         * @memberof ViewerDropHandler.prototype
         * @type {Viewer}
         */
        viewer : {
            get : function() {
                return this._viewer;
            }
        },

        /**
         * Gets or sets a value indicating if existing data sources should be cleared before adding the newly dropped sources.
         * @memberof ViewerDropHandler.prototype
         * @type {Boolean}
         */
        clearOnDrop : {
            get : function() {
                return this._clearOnDrop;
            },
            set : function(value) {
                this._clearOnDrop = value;
            }
        }
    });

    /**
     * @memberof ViewerDropHandler
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    ViewerDropHandler.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the handler.
     * @memberof Viewer
     */
    ViewerDropHandler.prototype.destroy = function() {
        //cleanup subscriptions
        this.enabled = false;
        return destroyObject(this);
    };

    function stop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    function unsubscribe(dropHandler) {
        var currentTarget = dropHandler._dropTarget;
        if (typeof currentTarget !== 'undefined') {
            currentTarget.removeEventListener('drop', dropHandler._handleDrop, false);
            currentTarget.removeEventListener('dragenter', stop, false);
            currentTarget.removeEventListener('dragover', stop, false);
            currentTarget.removeEventListener('dragexit', stop, false);
        }
    }

    function subscribe(dropHandler) {
        var dropTarget = dropHandler._dropTarget;
        dropTarget.addEventListener('drop', dropHandler._handleDrop, false);
        dropTarget.addEventListener('dragenter', stop, false);
        dropTarget.addEventListener('dragover', stop, false);
        dropTarget.addEventListener('dragexit', stop, false);
    }

    function createOnLoadCallback(dropHandler, source, firstTime) {
        var viewer = dropHandler.viewer;
        return function(evt) {
            var czmlSource = new CzmlDataSource();
            try {
                czmlSource.load(JSON.parse(evt.target.result), source);
                viewer.dataSources.add(czmlSource);
                if (firstTime) {
                    var dataClock = czmlSource.getClock();
                    if (typeof dataClock !== 'undefined') {
                        dataClock.clone(viewer.clock);
                        viewer.timeline.zoomTo(dataClock.startTime, dataClock.stopTime);
                    }
                }
            } catch (error) {
                dropHandler.onError.raiseEvent(dropHandler, source, error);
            }
        };
    }

    function createOnErrorCallback(dropHandler, name) {
        return function(evt) {
            dropHandler.onError.raiseEvent(dropHandler, name, evt.target.error);
        };
    }

    return ViewerDropHandler;
});