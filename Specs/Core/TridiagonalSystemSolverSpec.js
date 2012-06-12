/*global defineSuite*/
defineSuite([
         'Core/TridiagonalSystemSolver',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         TridiagonalSystemSolver,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

   it('solve throws exception without lower diagonal', function() {
        expect(function() {
            TridiagonalSystemSolver.solve();
        }).toThrow();
    });

    it('solve throws exception without diagonal', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([]);
        }).toThrow();
    });

    it('solve throws exception without upper diagonal', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([], []);
        }).toThrow();
    });

    it('solve throws exception without rhs vector', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([], [], []);
        }).toThrow();
    });

    it('solve throws exception when rhs vector length is not equal to diagonal length', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([], [], [], [1]);
        }).toThrow();
    });

    it('solve throws exception when lower diagonal length is not equal to upper diagonal length', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([1], [1], [], [1]);
        }).toThrow();
    });

    it('solve throws exception when lower/upper diagonal length is not one less than diagonal length', function() {
        expect(function() {
            TridiagonalSystemSolver.solve([1], [1], [1], [1]);
        }).toThrow();
    });

    it('solve three unknowns', function() {
        var l = [1.0, 1.0];
        var d = [-2.175, -2.15, -2.125];
        var u = [1.0, 1.0];
        var r = [new Cartesian3(-1.625),
                 new Cartesian3(0.5),
                 new Cartesian3(1.625)];

        var expected = [new Cartesian3(0.552), new Cartesian3(-0.4244), new Cartesian3(-0.9644)];
        var actual = TridiagonalSystemSolver.solve(l, d, u, r);

        expect(actual.length).toEqual(expected.length);
        expect(actual[0].equalsEpsilon(expected[0], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[1].equalsEpsilon(expected[1], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[2].equalsEpsilon(expected[2], CesiumMath.EPSILON4)).toEqual(true);
    });

    it('solve nine unknowns', function() {
        var l = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
        var d = [-2.0304, -2.0288, -2.0272, -2.0256, -2.0240, -2.0224, -2.0208, -2.0192, -2.0176];
        var u = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
        var r = [
                 new Cartesian3(-1.952),
                 new Cartesian3(0.056),
                 new Cartesian3(0.064),
                 new Cartesian3(0.072),
                 new Cartesian3(0.08),
                 new Cartesian3(0.088),
                 new Cartesian3(0.096),
                 new Cartesian3(0.104),
                 new Cartesian3(1.112)
             ];

        var expected = [
                        new Cartesian3(1.3513),
                        new Cartesian3(0.7918),
                        new Cartesian3(0.3110),
                        new Cartesian3(-0.0974),
                        new Cartesian3(-0.4362),
                        new Cartesian3(-0.7055),
                        new Cartesian3(-0.9025),
                        new Cartesian3(-1.0224),
                        new Cartesian3(-1.0579)
                    ];
        var actual = TridiagonalSystemSolver.solve(l, d, u, r);

        expect(actual.length).toEqual(expected.length);
        expect(actual[0].equalsEpsilon(expected[0], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[1].equalsEpsilon(expected[1], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[2].equalsEpsilon(expected[2], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[3].equalsEpsilon(expected[3], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[4].equalsEpsilon(expected[4], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[5].equalsEpsilon(expected[5], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[6].equalsEpsilon(expected[6], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[7].equalsEpsilon(expected[7], CesiumMath.EPSILON4)).toEqual(true);
        expect(actual[8].equalsEpsilon(expected[8], CesiumMath.EPSILON4)).toEqual(true);
    });
});
