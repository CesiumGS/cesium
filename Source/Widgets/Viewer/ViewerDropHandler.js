/*global define*/
define(['../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../Core/wrapFunction',
        '../../DynamicScene/CzmlDataSource'
        ], function(
                defaultValue,
                DeveloperError,
                defineProperties,
                destroyObject,
                Event,
                wrapFunction,
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
     * dropHandler.onDropError.addEventListener(function(dropHandler, source, error) {
     *     window.alert('Error processing ' + source + ':' + error);
     * });
     */
    var ViewerDropHandler = {
        initialize : function(viewer, options) {
            if (typeof viewer === 'undefined') {
                throw new DeveloperError('viewer is required.');
            }
            if (viewer.hasOwnProperty('dropTarget')) {
                throw new DeveloperError('dropTarget is already defined.');
            }
            if (viewer.hasOwnProperty('dropEnabled')) {
                throw new DeveloperError('dropEnabled is already defined.');
            }
            if (viewer.hasOwnProperty('onDropError')) {
                throw new DeveloperError('onDropError is already defined.');
            }
            if (viewer.hasOwnProperty('clearOnDrop')) {
                throw new DeveloperError('clearOnDrop is already defined.');
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

            //Local variables
            var _dropTarget = dropTarget;
            var _dropEnabled = true;
            var _onDropError = new Event();
            var _clearOnDrop = defaultValue(options.clearOnDrop, true);

            defineProperties(viewer, {
                /**
                 * Gets or sets the element to serve as the drop target.
                 * @memberof ViewerDropHandler.prototype
                 * @type {Element}
                 */
                dropTarget : {
                    //TODO See https://github.com/AnalyticalGraphicsInc/cesium/issues/832
                    //* @exception {DeveloperError} value is required.
                    get : function() {
                        return _dropTarget;
                    },
                    set : function(value) {
                        if (typeof value === 'undefined') {
                            throw new DeveloperError('value is required.');
                        }
                        unsubscribe(_dropTarget, _handleDrop);
                        _dropTarget = value;
                        subscribe(_dropTarget, _handleDrop);
                    }
                },

                /**
                 * Gets or sets a value indicating if drag and drop support is enabled.
                 * @memberof ViewerDropHandler.prototype
                 * @type {Element}
                 */
                dropEnabled : {
                    get : function() {
                        return _dropEnabled;
                    },
                    set : function(value) {
                        if (value !== _dropEnabled) {
                            if (value) {
                                subscribe(_dropTarget, _handleDrop);
                            } else {
                                unsubscribe(_dropTarget, _handleDrop);
                            }
                            _dropEnabled = value;
                        }
                    }
                },

                /**
                 * Gets the event that will be raised when an error is encountered during drop processing.
                 * @memberof ViewerDropHandler.prototype
                 * @type {Event}
                 */
                onDropError : {
                    get : function() {
                        return _onDropError;
                    }
                },

                /**
                 * Gets or sets a value indicating if existing data sources should be cleared before adding the newly dropped sources.
                 * @memberof ViewerDropHandler.prototype
                 * @type {Boolean}
                 */
                clearOnDrop : {
                    get : function() {
                        return _clearOnDrop;
                    },
                    set : function(value) {
                        _clearOnDrop = value;
                    }
                }
            });

            function _handleDrop(event) {
                stop(event);

                if (_clearOnDrop) {
                    viewer.dataSources.removeAll();
                }

                var files = event.dataTransfer.files;
                var length = files.length;
                for ( var i = 0; i < length; i++) {
                    var f = files[i];
                    var reader = new FileReader();
                    reader.onload = createOnLoadCallback(viewer, f.name, i === 0);
                    reader.onerror = createOnDropErrorCallback(viewer, f.name);
                    reader.readAsText(f);
                }
            }

            //Enable drop by default;
            subscribe(_dropTarget, _handleDrop);

            //Wrap the destroy function to make sure all events are unsubscribed from
            viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
                viewer.dropEnabled = false;
            });

            //Specs need access to _handleDrop
            viewer._handleDrop = _handleDrop;

            return viewer;
        }
    };

    function stop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    function unsubscribe(_dropTarget, _handleDrop) {
        var currentTarget = _dropTarget;
        if (typeof currentTarget !== 'undefined') {
            currentTarget.removeEventListener('drop', _handleDrop, false);
            currentTarget.removeEventListener('dragenter', stop, false);
            currentTarget.removeEventListener('dragover', stop, false);
            currentTarget.removeEventListener('dragexit', stop, false);
        }
    }

    function subscribe(_dropTarget, _handleDrop) {
        var dropTarget = _dropTarget;
        dropTarget.addEventListener('drop', _handleDrop, false);
        dropTarget.addEventListener('dragenter', stop, false);
        dropTarget.addEventListener('dragover', stop, false);
        dropTarget.addEventListener('dragexit', stop, false);
    }

    function createOnLoadCallback(viewer, source, firstTime) {
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
                viewer.onDropError.raiseEvent(viewer, source, error);
            }
        };
    }

    function createOnDropErrorCallback(viewer, name) {
        return function(evt) {
            viewer.onDropError.raiseEvent(viewer, name, evt.target.error);
        };
    }

    return ViewerDropHandler;
});