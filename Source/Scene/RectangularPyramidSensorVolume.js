/*global define*/
define([
        '../Core/clone',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix4',
        './CustomSensorVolume',
        './Material'
    ], function(
        clone,
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Matrix4,
        CustomSensorVolume,
        Material) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias RectangularPyramidSensorVolume
     * @constructor
     *
     * @see SensorVolumeCollection#addRectangularPyramid
     */
    var RectangularPyramidSensorVolume = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * <code>true</code> if this sensor will be shown; otherwise, <code>false</code>
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * When <code>true</code>, a polyline is shown where the sensor outline intersections the globe.
         *
         * @type {Boolean}
         *
         * @default true
         *
         * @see RectangularPyramidSensorVolume#intersectionColor
         */
        this.showIntersection = defaultValue(options.showIntersection, true);

        /**
         * <p>
         * Determines if a sensor intersecting the ellipsoid is drawn through the ellipsoid and potentially out
         * to the other side, or if the part of the sensor intersecting the ellipsoid stops at the ellipsoid.
         * </p>
         *
         * @type {Boolean}
         * @default false
         */
        this.showThroughEllipsoid = defaultValue(options.showThroughEllipsoid, false);

        /**
         * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
         * coordinates, the sensor's principal direction is along the positive z-axis.  Half angles measured from the
         * principal direction and in the direction of the x-axis and y-axis define the rectangle of the rectangular
         * cross section.
         * <br /><br />
         * <div align='center'>
         * <img src='images/RectangularPyramidSensorVolume.setModelMatrix.png' /><br />
         * Model coordinate system for a sensor
         * </div>
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's opens upward, along the surface normal.
         * var center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
         * sensor.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @default {@link Number.POSITIVE_INFINITY}
         */
        this.radius = defaultValue(options.radius, Number.POSITIVE_INFINITY);

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @default {@link CesiumMath.PI_OVER_TWO}
         *
         *
         * @see RectangularPyramidSensorVolume#yHalfAngle
         */
        this.xHalfAngle = defaultValue(options.xHalfAngle, CesiumMath.PI_OVER_TWO);
        this._xHalfAngle = undefined;

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @default {@link CesiumMath.PI_OVER_TWO}
         *
         * @see RectangularPyramidSensorVolume#xHalfAngle
         */
        this.yHalfAngle = defaultValue(options.yHalfAngle, CesiumMath.PI_OVER_TWO);
        this._yHalfAngle = undefined;

        /**
         * The surface appearance of the sensor.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type {Material}
         * @default Material.fromType(Material.ColorType)
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * sensor.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * sensor.material = Cesium.Material.fromType(Cesium.Material.StripeType);
         */
        this.material = defined(options.material) ? options.material : Material.fromType(Material.ColorType);

        /**
         * The color of the polyline where the sensor outline intersects the globe.  The default is {@link Color.WHITE}.
         *
         * @type {Color}
         * @default {@link Color.WHITE}
         *
         * @see RectangularPyramidSensorVolume#showIntersection
         */
        this.intersectionColor = Color.clone(defaultValue(options.intersectionColor, Color.WHITE));

        /**
         * The approximate pixel width of the polyline where the sensor outline intersects the globe.  The default is 5.0.
         *
         * @type {Number}
         * @default 5.0
         *
         * @see CustomSensorVolume#showIntersection
         */
        this.intersectionWidth = defaultValue(options.intersectionWidth, 5.0);

        /**
         * User-defined object returned when the sensors is picked.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;

        var customSensorOptions = clone(options);
        customSensorOptions._pickPrimitive = defaultValue(options._pickPrimitive, this);
        this._customSensor = new CustomSensorVolume(customSensorOptions);
    };

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} this.xHalfAngle and this.yHalfAngle must each be less than 90 degrees.
     * @exception {DeveloperError} this.radius must be greater than or equal to zero.
     */
    RectangularPyramidSensorVolume.prototype.update = function(context, frameState, commandList) {
        //>>includeStart('debug', pragmas.debug)
        if ((this.xHalfAngle > CesiumMath.PI_OVER_TWO) || (this.yHalfAngle > CesiumMath.PI_OVER_TWO)) {
            throw new DeveloperError('this.xHalfAngle and this.yHalfAngle must each be less than or equal to 90 degrees.');
        }
        //>>includeEnd('debug');

        var s = this._customSensor;

        s.show = this.show;
        s.showIntersection = this.showIntersection;
        s.showThroughEllipsoid = this.showThroughEllipsoid;
        s.modelMatrix = this.modelMatrix;
        s.radius = this.radius;
        s.material = this.material;
        s.intersectionColor = this.intersectionColor;
        s.intersectionWidth = this.intersectionWidth;
        s.id = this.id;

        if ((this._xHalfAngle !== this.xHalfAngle) || (this._yHalfAngle !== this.yHalfAngle)) {

            this._xHalfAngle = this.xHalfAngle;
            this._yHalfAngle = this.yHalfAngle;

            // At 90 degrees the sensor is completely open, and tan() goes to infinity.
            var tanX = Math.tan(Math.min(this.xHalfAngle, CesiumMath.toRadians(89.0)));
            var tanY = Math.tan(Math.min(this.yHalfAngle, CesiumMath.toRadians(89.0)));
            var theta = Math.atan(tanX / tanY);
            var cone = Math.atan(Math.sqrt(tanX * tanX + tanY * tanY));

            s.setDirections([{
                clock : theta,
                cone : cone
            }, {
                clock : CesiumMath.toRadians(180.0) - theta,
                cone : cone
            }, {
                clock : CesiumMath.toRadians(180.0) + theta,
                cone : cone
            }, {
                clock : -theta,
                cone : cone
            }]);
        }

        s.update(context, frameState, commandList);
    };

    /**
     * DOC_TBA
     */
    RectangularPyramidSensorVolume.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    RectangularPyramidSensorVolume.prototype.destroy = function() {
        this._customSensor = this._customSensor && this._customSensor.destroy();
        return destroyObject(this);
    };

    return RectangularPyramidSensorVolume;
});
