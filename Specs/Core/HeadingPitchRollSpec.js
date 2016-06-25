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
        for (var i = 0; i < testingTab.length; i++) {
            var init = testingTab[i];
            var result = HeadingPitchRoll.fromQuaternion(Quaternion.fromHeadingPitchRoll(init[0], init[1], init[2]));
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
