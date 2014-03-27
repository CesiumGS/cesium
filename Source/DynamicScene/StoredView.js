/*global define*/
define(['../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Scene/SceneMode',
        './StoredViewCameraRotationMode'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        SceneMode,
        StoredViewCameraRotationMode) {
    "use strict";

    var viewIndex = 0;

    /**
     * StoredView instances are the primary data store for processed data.
     * They are used primarily by the visualizers to create and maintain graphic
     * primitives that represent the StoredView's properties at a specific time.
     * @alias StoredView
     * @constructor
     *
     * @param {String} [id] A unique identifier for this stored view.  If no id is provided, one is generated.
     * @param {Camera} [camera] The camera to clone for this stored view.  If none is provided, a default home view is used.
     *
     * @see Property
     * @see StoredViewCollection
     */
    var StoredView = function(id, camera) {
        if (!defined(id)) {
            ++viewIndex;
            id = 'View ' + viewIndex;
        }

        this._id = id;

        var maxRadii = Ellipsoid.WGS84.maximumRadius;
        var position;
        var direction;
        var up;

        if (defined(camera)) {
            position = Cartesian3.clone(camera.position);
            direction = Cartesian3.clone(camera.direction);
            up = Cartesian3.clone(camera.up);
            // TODO: FOV, constrainedAxis
        } else {
            position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0)), 2.5 * maxRadii);
            direction = Cartesian3.normalize(Cartesian3.negate(position));
            var right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z));
            up = Cartesian3.cross(right, direction);
        }

        /**
         * Gets or sets the scene mode for this view.
         * @memberof StoredView.prototype
         * @type {SceneMode}
         */
        this.sceneMode = SceneMode.SCENE3D;

        /**
         * Gets or sets the foreground dynamicObject.
         * @memberof StoredView.prototype
         * @type {DynamicObject}
         */
        this.foregroundObject = undefined;

        /**
         * Gets or sets the background dynamicObject.
         * @memberof StoredView.prototype
         * @type {DynamicObject}
         */
        this.backgroundObject = undefined;

        /**
         * Gets or sets the camera rotation mode, which governs how the camera rotates over time
         * when the clock is animating.
         * @memberof StoredView.prototype
         * @type {StoredViewCameraRotationMode}
         */
        this.cameraRotationMode = StoredViewCameraRotationMode.EARTH_FIXED;

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = position;

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = direction;

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = up;

        /**
         * Gets or sets the constrained axis of rotation for user input on the camera.
         * @memberof StoredView.prototype
         * @type {Cartesian3}
         */
        this.constrainedAxis = Cartesian3.UNIT_Z;

        /**
         * Gets or sets the field of view of the camera, in degrees.
         * @memberof StoredView.prototype
         * @type {Number}
         */
        this.fieldOfView = 60.0;
    };

    defineProperties(StoredView.prototype, {
        /**
         * Gets the unique ID associated with this object.
         * @memberof StoredView.prototype
         * @type {String}
         */
        id : {
            get : function() {
                return this._id;
            }
        }
    });

    /**
     * Given a time, returns true if this stored view is valid at that time.
     * @memberof StoredView
     *
     * @param {JulianDate} time The time to check availability for.
     * @returns true if the object should have data during the provided time, false otherwise.
     */
    StoredView.prototype.isAvailable = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        if (defined(this.foregroundObject) && !this.foregroundObject.isAvailable(time)) {
            return false;
        }

        if (defined(this.backgroundObject) && !this.backgroundObject.isAvailable(time)) {
            return false;
        }

        return true;
    };

    return StoredView;
});
