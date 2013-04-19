/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Matrix3',
        './KeplerianElements'
    ],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Matrix3,
        KeplerianElements) {
    "use strict";

    /**
     * Modified Keplerian orbital elements.  These are the same as the Classical/Keplerian orbital elements
     * except that Radius of Periapsis and the inverse of Semimajor Axis are used instead of
     * Semimajor Axis and Eccentricity.  This is useful because the Radius of Periapsis is well defined
     * for all but rectilinear orbits.
     * @see KeplerianElements
     */


    /**
     *  Initialize a set of modified Keplerian elements.
     * @alias ModifiedKeperianElements
     * @constructor
     *
     * @param {Number} radiusOfPeriapsis Radius of periapsis (distance)
     * @param {Number} inverseSemimajorAxis The inverse of semimajor axis (distance)
     * @param {Number} inclination Inclination (radians)
     * @param {Number} argumentOfPeriapsis Argument of periapsis (radians)
     * @param {Number} rightAscensionOfAscendingNode Right ascension of the ascending node (radians)
     * @param {Number} trueAnomaly True anomaly (radians)
     * @param {Number} gravitationalParameter The gravitational parameter associated with these elements (distance cubed per time squared)
     *
     */
    var ModifiedKeplerianElements = function(radiusOfPeriapsis, inverseSemimajorAxis, inclination, argumentOfPeriapsis,
            rightAscensionOfAscendingNode, trueAnomaly, gravitationalParameter) {
        if (inclination < 0 || inclination > CesiumMath.PI) {
            throw new DeveloperError('inclination out of range.');
        }
        this.radiusOfPeriapsis = radiusOfPeriapsis;
        this.inverseSemimajorAxis = inverseSemimajorAxis;
        this.inclination = inclination;
        this.eccentricity = 1.0 - radiusOfPeriapsis * inverseSemimajorAxis;
        this.argumentOfPeriapsis = argumentOfPeriapsis;
        this.rightAscensionOfAscendingNode = rightAscensionOfAscendingNode;
        this.trueAnomaly = trueAnomaly;
        this.gravitationalParameter = gravitationalParameter;
        this.type = chooseOrbit(this.eccentricity, 0.0);
        if (this.type === 'Hyperbolic' && Math.abs(CesiumMath.NegativePiToPi(this.trueAnomaly)) >= Math.acos(- 1.0 / this.eccentricity)) {
            throw new DeveloperError('invalid trueAnomaly.');
        }
    };

    function chooseOrbit(eccentricity, tolerance)
    {
        if (eccentricity < 0)
        {
            throw new DeveloperError('eccentricity cannot be negative.');
        }
        else if (eccentricity <= tolerance)
        {
            return 'Circular';
        }
        else if (eccentricity < 1.0 - tolerance)
        {
            return 'Elliptical';
        }
        else if (eccentricity <= 1.0 + tolerance)
        {
            return 'Parabolic';
        }
        else
        {
            return 'Hyperbolic';
        }
    }

    /**
     * Returns a Cartesian representation of these orbital elements.
     * @param {ModifiedKeplerianElements} element
     * @returns {Cartesian3} Equivalent Cartesian
     */
    ModifiedKeplerianElements.ToCartesian = function(element) {
        var perifocalToEquatorial = KeplerianElements.PerifocalToCartesianMatrix(element.argumentOfPeriapsis, element.inclination, element.rightAscensionOfAscendingNode);
        var semilatus = element.radiusOfPeriapsis * (1.0 + element.eccentricity);
        var costheta = Math.cos(element.trueAnomaly);
        var sintheta = Math.sin(element.trueAnomaly);

        var denom = (1.0 + element.eccentricity * costheta);
        if (denom <= CesiumMath.Epsilon10) {
            throw new DeveloperError('elements cannot be converted to cartesian');
        }

        var radius = semilatus / denom;
        var position = new Cartesian3(radius * costheta, radius * sintheta, 0.0);

        return perifocalToEquatorial.multiplyByVector(position);
    };


    /**
     * Returns a Cartesian representation of these orbital elements.
     *
     * @returns {Cartesian3} Equivalent Cartesian
     */
    ModifiedKeplerianElements.prototype.ToCartesian = function(){
        return ModifiedKeplerianElements.ToCartesian(this);
    };

    return ModifiedKeplerianElements;
});