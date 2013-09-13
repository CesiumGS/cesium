/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/loadXML',
        '../Core/Clock',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Cartesian3',
        '../Core/Matrix3',
        '../Core/HermiteSpline',
        '../Core/Quaternion',
        '../Core/OrientationInterpolator',
        '../Scene/sampleTerrain',
        './DynamicObjectCollection',
        './DynamicClock',
        './processGxTour',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        defaultValue,
        Event,
        Iso8601,
        loadXML,
        Clock,
        ClockRange,
        ClockStep,
        JulianDate,
        TimeInterval,
        CesiumMath,
        Ellipsoid,
        Cartesian3,
        Matrix3,
        HermiteSpline,
        Quaternion,
        OrientationInterpolator,
        sampleTerrain,
        DynamicObjectCollection,
        DynamicClock,
        GxTourProcessor,
        when) {
    "use strict";

    function loadKmlTour(dataSource, kmlNode, sourceUri) {

        // process gx:Tour
        var tourNodes = kmlNode.getElementsByTagNameNS(GxTourProcessor.GX_NS, 'Tour');
        // TBD: why just one tour?
        if (tourNodes.length === 1) {
            var processor = new GxTourProcessor();
            processor.processTour(tourNodes[0]);
            var tour = processor.getPlaylist();

            if (typeof dataSource._terrainProvider !== 'undefined') {
                // make sure that no point is below ground
                var coordinates = [];

                for (var i = 0; i < tour.length; i++) {
                    var point = tour[i];
                    if (point.type === 'flyTo') {
                        coordinates.push(point.camera.location.clone());
                    }
                }

                when(sampleTerrain(dataSource._terrainProvider, 11, coordinates), function(coords) {
                    if (coords.length === tour.length) {
                        for (i = 0; i < coords.length; ++i) {
                            if (tour[i].camera.location.height < coords[i].height + 0.5) {
                                tour[i].camera.location.height = coords[i].height + 0.5;
                            }
                        }
                    }

                    createDynamicDataObject(dataSource, tour);
                });

            } else {
                createDynamicDataObject(dataSource, tour);
            }
        }
    }


    function createDynamicDataObject(dataSource, tour) {
        var oripath = calcOrientationsAndPath(tour);

        // calculate the clock
        var start = new JulianDate();
        var duration = 0;
        for (var i = 0; i < tour.length - 1; ++i) {
            duration += tour[i].duration;
        }
        var end = start.addSeconds(duration / 1000);

        dataSource._clock = new DynamicClock();
        dataSource._clock.startTime   = start;
        dataSource._clock.currentTime = start;
        dataSource._clock.stopTime    = end;
        dataSource._clock.clockRange  = ClockRange.CLAMPED;

        // create a dynamic object based on the results
        var object = dataSource._dynamicObjectCollection.getOrCreateObject('gxTour:' + start.toIso8601());
        object.clock = dataSource._clock;
        object.gxTour = tour;
        object.availability = new TimeInterval(start, end, true, false);
        object.orientations = oripath.orientations;
        object.camerapath = oripath.path;
        object.durationms = duration;

        dataSource._changed.raiseEvent(dataSource);
    }

    /**
     * Create an orientation interpolator based on a gx:Tour
     *
     * @param tour a gxTour object, as returned by the GxTourProcessor
     * @return a pair, with an orientations an OrientationInterpolator, that will contain the
     *         camera orientations and a path that contains a spline describing the path
     *         as described by the tour
     */
    function calcOrientationsAndPath(tour) {
        // TODO: get the ellipsoid from some real source
        var ellipsoid = Ellipsoid.WGS84;

        var locations = [];         // sequence of geographic locations
        var orientations = [];      // sequence of {direction, up} objects
        var durations = [];         // sequence of anim durations

        // process the tour nodes, and calculate locations, orientations and durations
        for (var i = 0; i < tour.length; i++) {
            var node = defaultValue(tour[i], defaultValue.EMPTY_OBJECT);

            if (node.type === 'flyTo') {
                // generate camera orientation matrix (Right,Up,Dir)
                var mat1 = generateOrientationMatrix(node.camera.location, ellipsoid);
                // apply camera rotations
                mat1 = rotCameraMatrix(mat1,
                    node.camera.orientation[0],
                    node.camera.orientation[1],
                    node.camera.orientation[2]
                );

                var v1 = mat1.getColumn(1); /*rmat.multiplyByVector(mat1.getColumn(1), v1);*/ // up
                var v2 = mat1.getColumn(2); /* rmat.multiplyByVector(mat1.getColumn(2), v2); */ // dir
                // v11 = rmat.multiplyByVector(v1); // up
                // v22 = rmat.multiplyByVector(v2); // dir

                // Store results
                // Cartograpic!
                locations.push(node.camera.location);
                orientations.push({ direction: v2, up: v1 });
                durations.push(node.duration);
            } else {
                // TBD handle 'wait' nodes
            }
        }

        // create a path based on the calculated locations
        var points = [];
        var t = 0;
        for (var k = 0; k < locations.length; k++) {
            var pt = ellipsoid.cartographicToCartesian(locations[k]);
            // set orientations too
            var ori = createQuaternion(orientations[k].direction, orientations[k].up);

            points.push({point: pt, time: t, orientation: ori});
            t += durations[k];
        }
        var path = createSpline(points);

        return { orientations: new OrientationInterpolator(points), path: path };
    }

    function createSpline(points) {
        if (points.length > 2) {
            return new HermiteSpline(points);
        }

        // only two points, use linear interpolation
        var p = points[0];
        var q = points[1];

        return {
            getControlPoints : function() {
                return points;
            },

            evaluate : function(time, result) {
                time = CesiumMath.clamp(time, p.time, q.time);
                var t = (time - p.time) / (q.time - p.time);
                return Cartesian3.lerp(p.point, q.point, t, result);
            }
        };
    }

    function createQuaternion(direction, up, result) {
        var cqRight = new Cartesian3();
        var cqUp = new Cartesian3();
        var viewMat = new Matrix3();

        direction.cross(up, cqRight);
        cqRight.cross(direction, cqUp);
        viewMat[0] = cqRight.x;
        viewMat[1] = cqUp.x;
        viewMat[2] = -direction.x;
        viewMat[3] = cqRight.y;
        viewMat[4] = cqUp.y;
        viewMat[5] = -direction.y;
        viewMat[6] = cqRight.z;
        viewMat[7] = cqUp.z;
        viewMat[8] = -direction.z;

        return Quaternion.fromRotationMatrix(viewMat, result);
    }

    /**
     * Calculates default camera direction matrix based on input location
     * By default a cinematic camera should look exactly at the center of ellipsoid
     * Its up vector always points towards geograpic North.
     *
     * @param {Geographic} loc Actual geographic location
     * @param {Ellipsoid} ell Ellipsoid
     *
     * @returns {Matrix3} Matrix containing three column vectors: right, up and direction
     */
    var generateOrientationMatrix = function(loc, ell) {
        // Surface Normal
        var sNorm = ell.geodeticSurfaceNormalCartographic(loc);


        // calculate cinematic camera up and dir vectors
        // i.  sNorm X North => Left
        var myLeft = sNorm.cross( Cartesian3.UNIT_Z ).normalize();
        // ii. Left X Up => dir (north)
        var upp = myLeft.cross(sNorm);  // upp should point to North
        var dirr = sNorm.negate();      // dirr should point to the center

        var myRight = myLeft.negate();

        // prepare rotation matrix (R U D)
        var mat1 = new Matrix3(
            myRight.x, upp.x, dirr.x,
            myRight.y, upp.y, dirr.y,
            myRight.z, upp.z, dirr.z
        );
        return mat1;
    };

    /**
     * Apply rotations to cam orientation matrix, which originally points to the center of
     * an ellipsoid and it's 'up' is pointing north.
     * The resulting matrix will have a camera pointing to the correct heading, with
     * a specified up-down tilt and rotation around its direction.
     *
     * @see https://developers.google.com/kml/documentation/cameras
     *  
     * @param {Matrix3} mat Cam orientation matrix (R U D)
     * @param {number} h Heading as compass angle in degrees (0 < h < 360), 0 = North
     * @param {number} t Tilt Horizontal tilting angle in degrees. (-180 < t < 180), 0 = Down, 90 = Head forward
     * @param {number} r Left-right rotation angle in degrees. (-180 < t < 180)
     *
     * @returns {Matrix3} Matrix having rotations applied to.
     */
    var rotCameraMatrix = function(mat, h, t, r){
        var mh, mt, mr;

        // Heading
        if (h === 0) {
            mh = Matrix3.IDENTITY;
        } else {
            mh = Matrix3.fromRotationZ(CesiumMath.toRadians(360 - h));
        }

        // Tilt
        if (t !== 0) {
            mt = Matrix3.fromRotationX(CesiumMath.toRadians(-t));
        } else {
            mt = Matrix3.IDENTITY;
        }

        // perform these two rotations so that we can determine the direction vector for roll
        Matrix3.multiply(mat, mh, mat);
        Matrix3.multiply(mat, mt, mat);
        
        // Roll (-180 < 0 < 180)
        // Roll around the calculated direction axis
        if (r !== 0) {
            var right = mat.getColumn(0);
            var up = mat.getColumn(1);
            var direction = mat.getColumn(2);

            var rad = CesiumMath.toRadians(r);
            mr = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(direction, rad));

            Matrix3.multiplyByVector(mr, right, right);
            Matrix3.multiplyByVector(mr, up, up);
            Matrix3.multiplyByVector(mr, direction, direction);

            mat = mat.setColumn(0, right);
            mat = mat.setColumn(1, up);
            mat = mat.setColumn(2, direction);
        }
        
        return mat;
    };

    /**
     * A {@link DataSource} which processes KML Tour.
     * @alias KmlTourDataSource
     * @constructor
     *
     * @param {TerrainProvider} terrainProvider a terrain provider that is used to make sure
     *        that the camera position is always above ground
     */
    var KmlTourDataSource = function(terrainProvider) {
        this._changed = new Event();
        this._error = new Event();
        this._animation = {};
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();

        this._terrainProvider = defaultValue(terrainProvider, undefined);
    };

    /**
     * Gets an event that will be raised when non-time-varying data changes
     * or if the return value of getIsTimeVarying changes.
     * @memberof KmlTourDataSource
     *
     * @returns {Event} The event.
     */
    KmlTourDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    /**
     * Gets an event that will be raised if an error is encountered during processing.
     * @memberof KmlTourDataSource
     *
     * @returns {Event} The event.
     */
    KmlTourDataSource.prototype.getErrorEvent = function() {
        return this._error;
    };

    /**
     * Gets the top level clock defined in KML or the availability of the
     * underlying data if no clock is defined.  If the KML document only contains
     * infinite data, undefined will be returned.
     * @memberof KmlTourDataSource
     *
     * @returns {DynamicClock} The clock associated with the current KML data, or undefined if none exists.
     */
    KmlTourDataSource.prototype.getClock = function() {
        return this._clock;
    };

    /**
     * Gets the DynamicObjectCollection generated by this data source.
     * @memberof KmlTourDataSource
     *
     * @returns {DynamicObjectCollection} The collection of objects generated by this data source.
     */
    KmlTourDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Gets a value indicating if the data varies with simulation time.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof KmlTourDataSource
     *
     * @returns {Boolean} True if the data is varies with simulation time, false otherwise.
     */
    KmlTourDataSource.prototype.getIsTimeVarying = function() {
        return true;
    };


    /**
     * Processes the provided KML without clearing any existing data.
     *
     * @param {Object} kmlNode The KML to be processed.
     * @param {String} source The source of the KML.
     *
     * @exception {DeveloperError} kmlNode is required.
     */
    KmlTourDataSource.prototype.process = function(kmlNode, source) {
        if (typeof kmlNode === 'undefined') {
            throw new DeveloperError('kmlNode is required.');
        }

        loadKmlTour(this, kmlNode, source);
    };

    /**
     * Replaces any existing data with the provided KML.
     *
     * @param {Object} kmlNode The KML to be processed.
     * @param {String} source The source of the KML.
     *
     * @exception {DeveloperError} kmlNode is required.
     */
    KmlTourDataSource.prototype.load = function(kmlNode, source) {
        if (typeof kmlNode === 'undefined') {
            throw new DeveloperError('kmlNode is required.');
        }

        loadKmlTour(this, kmlNode, source);
    };

    /**
     * Asynchronously processes the KML at the provided url without clearing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    KmlTourDataSource.prototype.processUrl = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return when(loadXML(url), function(kmlNode) {
            dataSource.process(kmlNode, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    /**
     * Asynchronously loads the KML at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    KmlTourDataSource.prototype.loadUrl = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return when(loadXML(url), function(kmlNode) {
            dataSource.load(kmlNode, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    return KmlTourDataSource;
});

