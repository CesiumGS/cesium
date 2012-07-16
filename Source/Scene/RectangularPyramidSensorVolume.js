/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix4',
        '../Renderer/BufferUsage',
        './ColorMaterial',
        './CustomSensorVolume'
    ], function(
        DeveloperError,
        Color,
        destroyObject,
        CesiumMath,
        Matrix4,
        BufferUsage,
        ColorMaterial,
        CustomSensorVolume) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias RectangularPyramidSensorVolume
     * @constructor
     *
     * @see SensorVolumeCollection#addRectangularPyramid
     */
    var RectangularPyramidSensorVolume = function(template) {
        var t = template || {};

        /**
         * <code>true</code> if this sensor will be shown; otherwise, <code>false</code>
         *
         * @type Boolean
         */
        this.show = (typeof t.show === 'undefined') ? true : t.show;

        /**
         * DOC_TBA
         *
         * @type Boolean
         */
        this.showIntersection = (typeof t.showIntersection === 'undefined') ? true : t.showIntersection;

        /**
         * <p>
         * Determines if a sensor intersecting the ellipsoid is drawn through the ellipsoid and potentially out
         * to the other side, or if the part of the sensor intersecting the ellipsoid stops at the ellipsoid.
         * </p>
         * <p>
         * The default is <code>false</code>, meaning the sensor will not go through the ellipsoid.
         * </p>
         *
         * @type Boolean
         */
        this.showThroughEllipsoid = (typeof t.showThroughEllipsoid === 'undefined') ? false : t.showThroughEllipsoid;

        /**
         * The 4x4 transformation matrix that transforms this sensor from model to world coordinates.  In it's model
         * coordinates, the sensor's principal direction is along the positive z-axis.  Half angles measured from the
         * principal direction and in the direction of the x-axis and y-axis define the extent of the rectangular
         * cross section.  This matrix is available to GLSL vertex and fragment shaders via
         * {@link agi_model} and derived uniforms.
         * <br /><br />
         * <div align='center'>
         * <img src='images/RectangularPyramidSensorVolume.setModelMatrix.png' /><br />
         * Model coordinate system for a sensor
         * </div>
         *
         * @type Matrix4
         *
         * @see agi_model
         *
         * @example
         * // The sensor's vertex is located on the surface at -75.59777 degrees longitude and 40.03883 degrees latitude.
         * // The sensor's opens upward, along the surface normal.
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * sensor.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         */
        this.modelMatrix = t.modelMatrix || Matrix4.IDENTITY;

        /**
         * DOC_TBA
         *
         * @type BufferUsage
         */
        this.bufferUsage = t.bufferUsage || BufferUsage.STATIC_DRAW;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.radius = (typeof t.radius === 'undefined') ? Number.POSITIVE_INFINITY : t.radius;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see RectangularPyramidSensorVolume#yHalfAngle
         */
        this.xHalfAngle = (typeof t.xHalfAngle === 'undefined') ? CesiumMath.PI_OVER_TWO : t.xHalfAngle;
        this._xHalfAngle = undefined;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see RectangularPyramidSensorVolume#xHalfAngle
         */
        this.yHalfAngle = (typeof t.yHalfAngle === 'undefined') ? CesiumMath.PI_OVER_TWO : t.yHalfAngle;
        this._yHalfAngle = undefined;

        /**
         * DOC_TBA
         */
        this.material = t.material || new ColorMaterial();

        /**
         * DOC_TBA
         */
        this.intersectionColor = (typeof t.intersectionColor !== 'undefined') ? Color.clone(t.intersectionColor) : new Color(1.0, 1.0, 0.0, 1.0);

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.erosion = (typeof t.erosion === 'undefined') ? 1.0 : t.erosion;

        t._pickIdThis = t._pickIdThis || this;
        this._customSensor = new CustomSensorVolume(t);
    };

    /**
     * DOC_TBA
     *
     * @memberof RectangularPyramidSensorVolume
     *
     * @exception {DeveloperError} this.xHalfAngle and this.yHalfAngle must each be less than 90 degrees.
     * @exception {DeveloperError} this.radius must be greater than or equal to zero.
     */
    RectangularPyramidSensorVolume.prototype.update = function(context, sceneState) {
        if ((this.xHalfAngle > CesiumMath.PI_OVER_TWO) || (this.yHalfAngle > CesiumMath.PI_OVER_TWO)) {
            throw new DeveloperError('this.xHalfAngle and this.yHalfAngle must each be less than or equal to 90 degrees.');
        }

        var s = this._customSensor;

        s.show = this.show;
        s.showIntersection = this.showIntersection;
        s.showThroughEllipsoid = this.showThroughEllipsoid;
        s.modelMatrix = this.modelMatrix;
        s.bufferUsage = this.bufferUsage;
        s.radius = this.radius;
        s.material = this.material;
        s.intersectionColor = this.intersectionColor;
        s.erosion = this.erosion;

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

        s.update(context, sceneState);
    };

    /**
     * DOC_TBA
     * @memberof RectangularPyramidSensorVolume
     */
    RectangularPyramidSensorVolume.prototype.render = function(context) {
        this._customSensor.render(context);
    };

    /**
     * DOC_TBA
     * @memberof RectangularPyramidSensorVolume
     */
    RectangularPyramidSensorVolume.prototype.updateForPick = function(context) {
        this._customSensor.updateForPick(context);
    };

    /**
     * DOC_TBA
     * @memberof RectangularPyramidSensorVolume
     */
    RectangularPyramidSensorVolume.prototype.renderForPick = function(context, framebuffer) {
        this._customSensor.renderForPick(context, framebuffer);
    };

    /**
     * DOC_TBA
     * @memberof RectangularPyramidSensorVolume
     */
    RectangularPyramidSensorVolume.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof RectangularPyramidSensorVolume
     */
    RectangularPyramidSensorVolume.prototype.destroy = function() {
        this._customSensor = this._customSensor && this._customSensor.destroy();
        return destroyObject(this);
    };

    return RectangularPyramidSensorVolume;
});