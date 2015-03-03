/*global defineSuite*/
defineSuite([
        'Core/HeadingPitchRoll',
        'Core/Quaternion'
    ], function(
        HeadingPitchRoll,
        Quaternion
        ) {
    "use strict";
    /*global expect*/

    it('conversion from quaternion', function() {
        var deg2rad=Math.PI/180;
        var testingTab=[[0,0,0],
            [90*deg2rad,0,0],
            [-90*deg2rad,0,0],
            [0,89*deg2rad,0],
            [0,-89*deg2rad,0],
            [0,0,90*deg2rad],
            [0,0,-90*deg2rad],
            [30*deg2rad,30*deg2rad,30*deg2rad],
            [-30*deg2rad,-30*deg2rad,45*deg2rad]];
        for (var i=0;i<testingTab.length;i++){
            var init=testingTab[i];
            var result=HeadingPitchRoll.fromQuaternion(Quaternion.fromHeadingPitchRoll(init[0],init[1],init[2]));
            expect(init[0]).toBeCloseTo(result.heading);
            expect(init[1]).toBeCloseTo(result.pitch);
            expect(init[2]).toBeCloseTo(result.roll);
        }
    });
    
    it('conversion from degrees', function() {
        var deg2rad=Math.PI/180;
        var testingTab=[[0,0,0],
            [90,0,0],
            [-90,0,0],
            [0,89,0],
            [0,-89,0],
            [0,0,90],
            [0,0,-90],
            [30,30,30],
            [-30,-30,45]];
        for (var i=0;i<testingTab.length;i++){
            var init=testingTab[i];
            var result=HeadingPitchRoll.fromDegrees(init[0],init[1],init[2]);
            expect(init[0]*deg2rad).toBeCloseTo(result.heading);
            expect(init[1]*deg2rad).toBeCloseTo(result.pitch);
            expect(init[2]*deg2rad).toBeCloseTo(result.roll);
        }
    });
    
});
