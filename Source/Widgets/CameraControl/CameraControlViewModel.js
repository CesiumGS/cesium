/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/isArray',
        '../../Core/Math',
        '../../Core/Matrix4',
        '../../DynamicScene/StoredView',
        '../../DynamicScene/StoredViewCollection',
        '../../Scene/CameraFlightPath',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian3,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        EventHelper,
        isArray,
        CesiumMath,
        Matrix4,
        StoredView,
        StoredViewCollection,
        CameraFlightPath,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link CameraControl}.
     * @alias CameraControlViewModel
     * @constructor
     */
    var CameraControlViewModel = function(scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        var that = this;
        this._cameraIcon = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
        this._bookmarkIcon = 'M17.396,1.841L6.076,25.986l7.341-4.566l1.186,8.564l11.32-24.146L17.396,1.841zM19.131,9.234c-0.562-0.264-0.805-0.933-0.541-1.495c0.265-0.562,0.934-0.805,1.496-0.541s0.805,0.934,0.541,1.496S19.694,9.498,19.131,9.234z';
        this._editIcon = 'M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z';
        this._followIcon = 'M16,3.5c-4.142,0-7.5,3.358-7.5,7.5c0,4.143,7.5,18.121,7.5,18.121S23.5,15.143,23.5,11C23.5,6.858,20.143,3.5,16,3.5z M16,14.584c-1.979,0-3.584-1.604-3.584-3.584S14.021,7.416,16,7.416S19.584,9.021,19.584,11S17.979,14.584,16,14.584z';
        this._timeRotateIcon = 'M 15.5,2.374 C 8.251,2.375 2.376,8.251 2.374,15.5 2.376,22.748 8.251,28.623 15.5,28.627 22.749,28.623 28.624,22.748 28.625,15.5 28.624,8.251 22.749,2.375 15.5,2.374 z m 0,23.249 C 9.909,25.615 5.385,21.09 5.375,15.5 5.385,9.909 9.909,5.384 15.5,5.374 21.09,5.384 25.615,9.909 25.624,15.499 25.615,21.09 21.091,25.615 15.5,25.623 z M 15.501,6.624 c -0.552,0 -1,0.448 \
            -1,1 l -0.466,7.343 -3.004,1.96 c -0.478,0.277 -0.642,0.889 -0.365,1.365 0.275,0.479 0.889,0.643 1.365,0.367 l 3.305,-1.676 C 15.39,16.99 15.444,17 15.501,17 c 0.828,0 1.5,-0.671 1.5,-1.5 l -0.5,-7.876 c 0,-0.552 -0.448,-1 -1,-1 z';
        this._userRotateIcon = 'M15.834,29.084 15.834,16.166 2.917,16.166 29.083,2.917z';
        this._fovIcon = 'M 26.355526,3.0853289 4.9492757,16.210329 l 21.4062503,12.96875 0,-4 -15.21875,-9.21875 15.21875,-9.3437501 z m -3.064934,6.9940131 -2.466316,1.568487 c 0.832593,1.424238 1.3125,2.994509 1.3125,4.65625 0,1.491653 -0.383959,2.910037 -1.0625,4.21875 L 23.555,21.966316 c 1.040521,-1.714153 1.369013,-3.782536 1.369013,-5.795658 0,-2.064563 -0.54229,-4.343667 -1.633421,-6.091316 z';

        this._scene = scene;
        this._knockoutSubscriptions = [];
        this._eventHelper = new EventHelper();
        this._storedViewCollection = new StoredViewCollection();

        /**
         * Gets or sets whether the camera control drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        /**
         * Gets or sets whether the camera view editor is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.editorVisible = false;

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'Camera options...';

        /**
         * Gets or sets the "Camera follows" indicator text.  This property is observable.
         *
         * @type {String}
         */
        this.cameraFollows = 'Earth';

        /**
         * Gets or sets the "Background object" indicator text.  This property is observable.
         *
         * @type {String}
         */
        this.cameraBackground = '(none)';

        /**
         * Gets or sets the name of the most recently used view.  This property is observable.
         *
         * @type {String}
         */
        this.currentViewName = 'View 1';

        this._viewNames = [];
        this._timeRotateMode = 'ECF';
        this._userRotateMode = 'Z';
        this._fieldOfView = 60.0;
        this._minFov = 0.001;
        this._maxFov = 160.0;
        this._fovRange = this._maxFov - this._minFov;

        knockout.track(this, ['dropDownVisible', 'editorVisible', 'tooltip', 'cameraFollows', 'cameraBackground',
                              'currentViewName', '_viewNames', '_timeRotateMode', '_userRotateMode', '_fieldOfView']);

        this._eventHelper.add(this._storedViewCollection.collectionChanged, function() {
            that._viewNames = that._storedViewCollection.getStoredViews().map(function (view) { return view.id; });
        });

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._saveStoredView = createCommand(function() {
            that.editorVisible = false;
            var storedView = that._storedViewCollection.getById(that.currentViewName);
            if (defined(storedView)) {
                throw "Not implemented yet"; // TODO
            } else {
                var newView = new StoredView(that.currentViewName, scene.camera);
                that._storedViewCollection.add(newView);
            }
        });

        this._visitStoredView = createCommand(function(viewName) {
            that.dropDownVisible = false;
            that.currentViewName = viewName;
            var storedView = that._storedViewCollection.getById(viewName);
            if (defined(storedView)) {
                var viewDescription = {
                    destination : storedView.position,
                    duration : 1500,
                    up : storedView.up,
                    direction : storedView.direction,
                    endReferenceFrame : Matrix4.IDENTITY  // TODO: calculate
                };
                var flight = CameraFlightPath.createAnimation(scene, viewDescription);
                scene.animations.add(flight);
            }
        });

        this._createName = createCommand(function() {
            var prefix = 'View ';
            var newName = '';
            var i = 1;
            while (that._viewNames.indexOf(newName = prefix + i.toFixed(0)) >= 0) {
                ++i;
            }
            that.currentViewName = newName;
            that.editorVisible = true;
        });

        this._knockoutSubscriptions.push(knockout.getObservable(this, 'dropDownVisible').subscribe(function(value) {
            if (value) {
                that.editorVisible = false;
            }
        }));

        this._knockoutSubscriptions.push(knockout.getObservable(this, 'editorVisible').subscribe(function(value) {
            if (value) {
                that.dropDownVisible = false;
            }
        }));

        this._knockoutSubscriptions.push(knockout.getObservable(this, '_timeRotateMode').subscribe(function(value) {
            if (value === 'Z') {
                scene.camera.constrainedAxis = Cartesian3.UNIT_Z.clone();
            } else if (value === 'U') {
                scene.camera.constrainedAxis = undefined;
            }
        }));

        this._knockoutSubscriptions.push(knockout.getObservable(this, '_userRotateMode').subscribe(function(value) {
            if (value === 'Z') {
                scene.camera.constrainedAxis = Cartesian3.UNIT_Z.clone();
            } else if (value === 'U') {
                scene.camera.constrainedAxis = undefined;
            }
        }));

        /**
         * True if any dropdown is open, the view list or the editor.  This property is observable.
         * @type {Boolean}
         */
        this.anyDropdown = undefined;
        knockout.defineProperty(this, 'anyDropdown', function() {
            return that.dropDownVisible || that.editorVisible;
        });

        /**
         * True if the camera is centered on the Earth in ICRF rotation mode (meaning the Earth rotates
         * with time, and the stars appear fixed).  This property is observable.
         * @type {Boolean}
         */
        this.useIcrf = undefined;
        knockout.defineProperty(this, 'useIcrf', function() {
            return that._timeRotateMode === 'ICRF';
        });

        /**
         * Gets or sets the field of view of the camera, in degrees.
         * @memberof StoredView.prototype
         * @type {Number}
         */
        this.fieldOfView = undefined;
        knockout.defineProperty(this, 'fieldOfView', {
            get : function() {
                return that._fieldOfView;
            },
            set : function(value) {
                var fov = window.parseFloat(value);
                if (!window.isNaN(fov)) {
                    that._fieldOfView = Math.max(Math.min(fov, that._maxFov), that._minFov);
                }
            }
        });

        this._fovSlider = undefined;
        knockout.defineProperty(this, '_fovSlider', {
            get : function() {
                return Math.pow((that._fieldOfView - that._minFov) / that._fovRange, 0.4);
            },
            set : function(value) {
                that._fieldOfView = Math.round((Math.pow(Math.max(value, 0), 2.5) * that._fovRange + that._minFov) * 1000) * 0.001;
            }
        });

        this._saveLabel = undefined;
        knockout.defineProperty(this, '_saveLabel', {
            get : function() {
                return this._viewNames.indexOf(this.currentViewName) < 0 ? "Save new view" : "Overwrite view";
            }
        });

        this._knockoutSubscriptions.push(knockout.getObservable(this, 'fieldOfView').subscribe(function(value) {
            scene.camera.frustum.fovy = CesiumMath.toRadians(value);
        }));

        // Add the default home view.
        var homeView = new StoredView('Home');
        this._storedViewCollection.add(homeView);
    };

    /**
     * The signature of events generated by {@link CameraControlViewModel#visitStoredView} and
     * {@link CameraControlViewModel#editStoredView}.
     * @memberof CameraControlViewModel
     * @function
     *
     * @param {String} name The name of the {@link StoredView}.
     */
    CameraControlViewModel.cameraControlEventCallback = undefined;

    defineProperties(CameraControlViewModel.prototype, {
        /**
         * Gets the collection of stored views for the camera.
         * @type {StoredViewCollection}
         */
        storedViewCollection : {
            get : function() {
                return this._storedViewCollection;
            }
        },
        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof CameraControlViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },
        /**
         * Gets the command that is executed when the save/overwrite button is clicked.
         * @memberof CameraControlViewModel.prototype
         *
         * @type {Command}
         */
        saveStoredView : {
            get : function() {
                return this._saveStoredView;
            }
        },
        /**
         * Gets the command that is executed when the user activates a stored view.
         * @memberof CameraControlViewModel.prototype
         *
         * @type {Command}
         */
        visitStoredView : {
            get : function() {
                return this._visitStoredView;
            }
        },
        /**
         * Gets the command that is executed when the user requests to edit a newly-named view.
         * @memberof CameraControlViewModel.prototype
         *
         * @type {Command}
         */
        createName : {
            get : function() {
                return this._createName;
            }
        }
    });

    /**
     * @memberof CameraControlViewModel
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CameraControlViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.
     * @memberof CameraControlViewModel
     */
    CameraControlViewModel.prototype.destroy = function() {
        var i;
        var numSubscriptions = this._knockoutSubscriptions.length;
        for (i = 0; i < numSubscriptions; ++i) {
            this._knockoutSubscriptions[i].dispose();
        }

        this._eventHelper.removeAll();
        destroyObject(this);
    };

    return CameraControlViewModel;
});