/*global defineSuite*/
defineSuite([
        'Core/HeadingPitchRoll',
        'Core/Math',
        'Core/Quaternion'
    ], function(
        HeadingPitchRoll,
        CesiumMath,
        Quaternion) {
    "use strict";
    /*global it,expect*/

    var deg2rad = CesiumMath.RADIANS_PER_DEGREE;

    it('construct with default values', function() {
        var headingPitchRoll = new HeadingPitchRoll();
        expect(headingPitchRoll.heading).toEqual(0.0);
        expect(headingPitchRoll.pitch).toEqual(0.0);
        expect(headingPitchRoll.roll).toEqual(0.0);
    });

    it('construct with all values', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
        expect(headingPitchRoll.heading).toEqual(1.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
        expect(headingPitchRoll.pitch).toEqual(2.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
        expect(headingPitchRoll.roll).toEqual(3.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
    });

    it('conversion from quaternion', function() {
        var testingTab = [
            [0, 0, 0],
            [90 * deg2rad, 0, 0],
            [-90 * deg2rad, 0, 0],
            [0, 89 * deg2rad, 0],
            [0, -89 * deg2rad, 0],
            [0, 0, 90 * deg2rad],
            [0, 0, -90 * deg2rad],
            [30 * deg2rad, 30 * deg2rad, 30 * deg2rad],
            [-30 * deg2rad, -30 * deg2rad, 45 * deg2rad]
        ];
        var hpr = new HeadingPitchRoll();
        for (var i = 0; i < testingTab.length; i++) {
            var init = testingTab[i];
            hpr.heading = init[0];
            hpr.pitch = init[1];
            hpr.roll = init[2];

            var result = HeadingPitchRoll.fromQuaternion(Quaternion.fromHeadingPitchRoll(hpr));
            expect(init[0]).toEqualEpsilon(result.heading, CesiumMath.EPSILON11);
            expect(init[1]).toEqualEpsilon(result.pitch, CesiumMath.EPSILON11);
            expect(init[2]).toEqualEpsilon(result.roll, CesiumMath.EPSILON11);
        }
    });

    it('conversion from degrees', function() {
        var testingTab = [
            [0, 0, 0],
            [90, 0, 0],
            [-90, 0, 0],
            [0, 89, 0],
            [0, -89, 0],
            [0, 0, 90],
            [0, 0, -90],
            [30, 30, 30],
            [-30, -30, 45]
        ];
        for (var i = 0; i < testingTab.length; i++) {
            var init = testingTab[i];
            var result = HeadingPitchRoll.fromDegrees(init[0], init[1], init[2]);
            expect(init[0] * deg2rad).toEqualEpsilon(result.heading, CesiumMath.EPSILON11);
            expect(init[1] * deg2rad).toEqualEpsilon(result.pitch, CesiumMath.EPSILON11);
            expect(init[2] * deg2rad).toEqualEpsilon(result.roll, CesiumMath.EPSILON11);
        }
    });

    it('fromDegrees with result', function() {
        var headingDeg = -115;
        var pitchDeg = 37;
        var rollDeg = 40;
        var headingRad = headingDeg * deg2rad;
        var pitchRad = pitchDeg * deg2rad;
        var rollRad = rollDeg * deg2rad;
        var result = new HeadingPitchRoll();
        var actual = HeadingPitchRoll.fromDegrees(headingDeg, pitchDeg, rollDeg, result);
        var expected = new HeadingPitchRoll(headingRad, pitchRad, rollRad);
        expect(actual).toEqual(expected);
        expect(actual).toBe(result);
    });

    it('clone with a result parameter', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
        var result = new HeadingPitchRoll();
        var returnedResult = HeadingPitchRoll.clone(headingPitchRoll, result);
        expect(headingPitchRoll).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(headingPitchRoll).toEqual(result);
    });

    it('clone works with a result parameter that is an input parameter', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.0 * deg2rad, 2.0 * deg2rad, 3.0 * deg2rad);
        var returnedResult = HeadingPitchRoll.clone(headingPitchRoll, headingPitchRoll);
        expect(headingPitchRoll).toBe(returnedResult);
    });

    it('equals', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.0, 2.0, 3.0);
        expect(HeadingPitchRoll.equals(headingPitchRoll, new HeadingPitchRoll(1.0, 2.0, 3.0))).toEqual(true);
        expect(HeadingPitchRoll.equals(headingPitchRoll, new HeadingPitchRoll(2.0, 2.0, 3.0))).toEqual(false);
        expect(HeadingPitchRoll.equals(headingPitchRoll, new HeadingPitchRoll(2.0, 1.0, 3.0))).toEqual(false);
        expect(HeadingPitchRoll.equals(headingPitchRoll, new HeadingPitchRoll(1.0, 2.0, 4.0))).toEqual(false);
        expect(HeadingPitchRoll.equals(headingPitchRoll, undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.0, 2.0, 3.0);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 3.0), 0.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(2.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 3.0, 3.0), 1.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 4.0), 1.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(2.0, 2.0, 3.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 3.0, 3.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(1.0, 2.0, 4.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(headingPitchRoll.equalsEpsilon(undefined, 1)).toEqual(false);

        headingPitchRoll = new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.0);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.0), 0.0)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.2, 4000000.0, 5000000.0), CesiumMath.EPSILON7)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.0, 4000000.2, 5000000.0), CesiumMath.EPSILON7)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.0, 4000000.0, 5000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.2, 4000000.2, 5000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(headingPitchRoll.equalsEpsilon(new HeadingPitchRoll(3000000.2, 4000000.2, 5000000.2), CesiumMath.EPSILON9)).toEqual(false);
        expect(headingPitchRoll.equalsEpsilon(undefined, 1)).toEqual(false);

        expect(HeadingPitchRoll.equalsEpsilon(undefined, headingPitchRoll, 1)).toEqual(false);
    });

    it('toString', function() {
        var headingPitchRoll = new HeadingPitchRoll(1.123, 2.345, 6.789);
        expect(headingPitchRoll.toString()).toEqual('(1.123, 2.345, 6.789)');
    });

    it('fromQuaternion throws with no parameter', function() {
        expect(function() {
            HeadingPitchRoll.fromQuaternion();
        }).toThrowDeveloperError();
    });

    var scratchHeadingPitchRoll = new HeadingPitchRoll();

    it('fromDegrees throws with no heading parameter', function() {
        expect(function() {
            HeadingPitchRoll.fromDegrees(undefined, 0, 0, scratchHeadingPitchRoll);
        }).toThrowDeveloperError();
        expect(function() {
            HeadingPitchRoll.fromDegrees(undefined, 0, 0);
        }).toThrowDeveloperError();
    });

    it('fromDegrees throws with no pitch parameter', function() {
        expect(function() {
            HeadingPitchRoll.fromDegrees(0, undefined, 0, scratchHeadingPitchRoll);
        }).toThrowDeveloperError();
        expect(function() {
            HeadingPitchRoll.fromDegrees(0, undefined, 0);
        }).toThrowDeveloperError();
    });

    it('fromDegrees throws with no roll parameter', function() {
        expect(function() {
            HeadingPitchRoll.fromDegrees(0, 0, undefined, scratchHeadingPitchRoll);
        }).toThrowDeveloperError();
        expect(function() {
            HeadingPitchRoll.fromDegrees(0, 0, undefined);
        }).toThrowDeveloperError();
    });

});
