/*global define*/
define([
        '../Core/buildModuleUrl',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Iau2000Orientation',
        '../Core/IauOrientationAxes',
        '../Core/JulianDate',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Simon1994PlanetaryPositions',
        '../Core/Transforms',
        './EllipsoidPrimitive',
        './Material'
    ], function(
        buildModuleUrl,
        Cartesian3,
        defined,
        destroyObject,
        Iau2000Orientation,
        IauOrientationAxes,
        JulianDate,
        Matrix3,
        Matrix4,
        Simon1994PlanetaryPositions,
        Transforms,
        EllipsoidPrimitive,
        Material) {
    "use strict";

    /**
     * Draws the Moon.
     * @alias Moon
     * @constructor
     *
     * @example
     * var moon = new Moon();
     * scene.getPrimitives.add(moon);
     */
    var Moon = function() {
        /**
         * Determines if the moon will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;

        /**
         * The moon texture.
         * @type {String}
         * @default buildModuleUrl('Assets/Textures/moonSmall.jpg')
         */
        this.moonTextureUrl = buildModuleUrl('Assets/Textures/moonSmall.jpg');
        this._moonTextureUrl = undefined;

        this._ellipsoid = undefined;
        this._axes = new IauOrientationAxes(Iau2000Orientation.ComputeMoon);
    };

    /**
     * The mean radius of the moon, according to the "Report of the IAU/IAG Working Group on
     * Cartographic Coordinates and Rotational Elements of the Planets and satellites: 2000",
     * Celestial Mechanics 82: 83-110, 2002.
     * @memberof Moon
     *
     * @type {Number}
     * @constant
     */
    Moon.Iau2000MeanLunarRadius = 1737400.0;

    var icrfToFixed = new Matrix3();
    var rotationScratch = new Matrix3();
    var translationScratch = new Cartesian3();

    Moon.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        var ellipsoid = this._ellipsoid;
        if (!defined(ellipsoid)) {
            ellipsoid = this._ellipsoid = new EllipsoidPrimitive();
            ellipsoid.radii = new Cartesian3(Moon.Iau2000MeanLunarRadius, Moon.Iau2000MeanLunarRadius, Moon.Iau2000MeanLunarRadius);

            ellipsoid.material = Material.fromType(Material.ImageType);
        }

        if (this.moonTextureUrl !== this._moonTextureUrl) {
            this._moonTextureUrl = this.moonTextureUrl;
            ellipsoid.material.uniforms.image = this._moonTextureUrl;
        }

        var date = frameState.time;
        if (!defined(Transforms.computeIcrfToFixedMatrix(date, icrfToFixed))) {
            Transforms.computeTemeToPseudoFixedMatrix(date, icrfToFixed);
        }

        var rotation = this._axes.evaluate(date, rotationScratch);
        Matrix3.transpose(rotation, rotation);
        Matrix3.multiply(icrfToFixed, rotation, rotation);

        var translation = Simon1994PlanetaryPositions.ComputeMoonPositionInEarthInertialFrame(date, translationScratch);
        Matrix3.multiplyByVector(icrfToFixed, translation, translation);

        Matrix4.fromRotationTranslation(rotation, translation, ellipsoid.modelMatrix);
        ellipsoid.update(context, frameState, commandList);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Moon
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Moon#destroy
     */
    Moon.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Moon
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Moon#isDestroyed
     *
     * @example
     * moon = moon && moon.destroy();
     */
    Moon.prototype.destroy = function() {
        this._ellipsoid = this._ellipsoid && this._ellipsoid.destroy();
        return destroyObject(this);
    };

    return Moon;
});