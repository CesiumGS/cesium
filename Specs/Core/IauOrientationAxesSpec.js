/*global defineSuite*/
defineSuite([
        'Core/IauOrientationAxes',
        'Core/Iau2000Orientation',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix3',
        'Core/TimeStandard'
    ], function(
        IauOrientationAxes,
        Iau2000Orientation,
        JulianDate,
        CesiumMath,
        Matrix3,
        TimeStandard) {
    'use strict';

    it('compute ICRF to Moon Fixed', function() {
        var date = new JulianDate(2451545.0, -32.184, TimeStandard.TAI);
        var axes = new IauOrientationAxes(Iau2000Orientation.ComputeMoon);

        // expected results taken from STK Components:
        //    EvaluatorGroup group = new EvaluatorGroup();
        //    IauOrientationAxes axes = new IauOrientationAxes(Iau2000Orientation.ComputeMoon);
        //    AxesEvaluator eval1 = axes.GetEvaluator(group);
        //    UnitQuaternion q = eval1.Evaluate(TimeConstants.J2000);
        //    Matrix3By3 expectedMatrix = new Matrix3By3(q);
        var expectedMatrix = new Matrix3(
            0.784227052091917, 0.55784711246016394, 0.27165148607559436,
            -0.62006191525085563, 0.7205566654668133, 0.31035675134719942,
            -0.022608671404182448, -0.41183090094261243, 0.91097977859342938);

        var mtx = axes.evaluate(date);
        expect(mtx).toEqualEpsilon(expectedMatrix, CesiumMath.EPSILON13);
    });
});
