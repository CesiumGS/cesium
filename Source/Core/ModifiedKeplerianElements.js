/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Iau2006XysData',
        './Iau2006XysSample',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './TimeConstants',
        './TimeStandard',
        './Ellipsoid',
        './JulianDate',
        './EarthOrientationParameters',
        './EarthOrientationParametersSample',
        '../ThirdParty/when'
    ],
    function(
        defaultValue,
        DeveloperError,
        Iau2006XysData,
        Iau2006XysSample,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        TimeConstants,
        TimeStandard,
        Ellipsoid,
        JulianDate,
        EarthOrientationParameters,
        EarthOrientationParametersSample,
        when) {
    "use strict";

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

    ModifiedKeplerianElements.ToCartesian = function(element) {
        var semilatus = element.radiusOfPeriapsis * (1.0 + element.eccentricity);
        var costheta = Math.cos(element.trueAnomaly);
        var sintheta = Math.sin(element.trueAnomaly);

        var denom = (1.0 + element.eccentricity * costheta);
        if (denom <= CesiumMath.Epsilon10) {
            throw new DeveloperError('elements cannot be converted to cartesian');
        }

        var radius = semilatus / denom;
        var position = new Cartesian3(radius * costheta, radius * sintheta, 0.0);

        return position;
    };

    ModifiedKeplerianElements.prototype.ToCartesian = function(){
        return ModifiedKeplerianElements.ToCartesian(this);
    };

    return ModifiedKeplerianElements;
});